#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("install", "unregister-menu", "remove-files", "prepare-upgrade")]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "",

    [Parameter(Mandatory = $false)]
    [string]$AppDataDir = "",

    [Parameter(Mandatory = $false)]
    [string]$ExecutablePath = "",

    [Parameter(Mandatory = $false)]
    [string]$ResourcesDir = "",

    [Parameter(Mandatory = $false)]
    [string]$UninstallerName = "",

    [Parameter(Mandatory = $false)]
    [switch]$Updated,

    [Parameter(Mandatory = $false)]
    [string]$InstallRegistryKey = "",

    [Parameter(Mandatory = $false)]
    [string]$UninstallRegistryKey = ""
)

$ErrorActionPreference = "Stop"

$InstallerLog = Join-Path $env:TEMP "sync-with-rclone-installer.log"
$UninstallerLog = Join-Path $env:TEMP "sync-with-rclone-uninstaller.log"

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Add-Content -Path $Path -Value $Message -Encoding UTF8
}

function Write-InstallerLog {
    param([string]$Message)
    Write-Log -Path $InstallerLog -Message $Message
}

function Write-UninstallerLog {
    param([string]$Message)
    Write-Log -Path $UninstallerLog -Message $Message
}

function Invoke-RegExe {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("add", "delete")]
        [string]$Action,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & reg.exe $Action @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $message = if ($output) { ($output | Out-String).Trim() } else { "reg.exe failed with exit code $exitCode" }
        throw $message
    }
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Ensure-ConfigFile {
    param(
        [Parameter(Mandatory = $true)][string]$TemplatePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    if (Test-Path -LiteralPath $DestinationPath) {
        return
    }

    Copy-Item -LiteralPath $TemplatePath -Destination $DestinationPath -Force
}

function Register-ContextMenu {
    param(
        [Parameter(Mandatory = $true)][string]$ExePath
    )

    $directoryKey = "HKCU\Software\Classes\Directory\shell\sync-with-rclone"
    $backgroundKey = "HKCU\Software\Classes\Directory\Background\shell\sync-with-rclone"

    foreach ($rootKey in @($directoryKey, $backgroundKey)) {
        Write-InstallerLog "ps1 install: reg add root=$rootKey"
        Invoke-RegExe -Action add -Arguments @($rootKey, "/f")
        Invoke-RegExe -Action add -Arguments @($rootKey, "/v", "MUIVerb", "/t", "REG_SZ", "/d", "sync-with-rclone", "/f")
        Invoke-RegExe -Action add -Arguments @($rootKey, "/v", "SubCommands", "/t", "REG_SZ", "/d", "", "/f")
    }

    $targets = @(
        @{
            RootKey = $directoryKey
            ArgumentToken = "%1"
        },
        @{
            RootKey = $backgroundKey
            ArgumentToken = "%V"
        }
    )

    foreach ($target in $targets) {
        foreach ($mode in @("push", "pull")) {
            $menuKey = "$($target.RootKey)\shell\$mode"
            $commandKey = "$menuKey\command"
            $label = (Get-Culture).TextInfo.ToTitleCase($mode)
            $command = "`"$ExePath`" $mode `"$($target.ArgumentToken)`""

            Write-InstallerLog "ps1 install: reg add menu=$menuKey"
            Invoke-RegExe -Action add -Arguments @($menuKey, "/f")
            Invoke-RegExe -Action add -Arguments @($menuKey, "/v", "MUIVerb", "/t", "REG_SZ", "/d", $label, "/f")
            Invoke-RegExe -Action add -Arguments @($commandKey, "/f")
            Invoke-RegExe -Action add -Arguments @($commandKey, "/ve", "/t", "REG_SZ", "/d", $command, "/f")
        }
    }
}

function Unregister-ContextMenu {
    foreach ($key in @(
        "HKCU\Software\Classes\Directory\shell\sync-with-rclone",
        "HKCU\Software\Classes\Directory\Background\shell\sync-with-rclone"
    )) {
        Write-UninstallerLog "ps1 unregister-menu: reg delete key=$key"
        & reg.exe delete $key /f | Out-Null
    }
}

function Remove-InstallFiles {
    param(
        [Parameter(Mandatory = $true)][string]$TargetDir,
        [Parameter(Mandatory = $true)][string]$CurrentUninstallerName,
        [Parameter(Mandatory = $true)][bool]$IsUpdated
    )

    if (-not (Test-Path -LiteralPath $TargetDir)) {
        return
    }

    $tempRoot = Join-Path $env:TEMP "sync-with-rclone-old-install"
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Ensure-Directory -Path $tempRoot

    Get-ChildItem -LiteralPath $TargetDir -Force | ForEach-Object {
        if ($_.Name -eq $CurrentUninstallerName) {
            return
        }

        $destination = Join-Path $tempRoot $_.Name
        Move-Item -LiteralPath $_.FullName -Destination $destination -Force
    }

    if ($IsUpdated -and (Test-Path -LiteralPath $tempRoot)) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Clear-InstallDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$TargetDir
    )

    if (-not (Test-Path -LiteralPath $TargetDir)) {
        return
    }

    Get-ChildItem -LiteralPath $TargetDir -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
    }
}

function Remove-RegistryKeyIfPresent {
    param(
        [Parameter(Mandatory = $true)][string]$RegistryKey
    )

    if ([string]::IsNullOrWhiteSpace($RegistryKey)) {
        return
    }

    & reg.exe delete $RegistryKey /f | Out-Null
}

try {
    switch ($Action) {
        "install" {
            Write-InstallerLog "ps1 install: begin"
            Write-InstallerLog "ps1 install: InstallDir=$InstallDir"
            Write-InstallerLog "ps1 install: AppDataDir=$AppDataDir"
            Write-InstallerLog "ps1 install: ResourcesDir=$ResourcesDir"

            Ensure-Directory -Path $AppDataDir

            $configTemplate = Join-Path $ResourcesDir "templates\config.json.win.example"
            $rcloneTemplate = Join-Path $ResourcesDir "templates\rclone.conf.win.example"
            $configPath = Join-Path $AppDataDir "config.json"
            $rcloneConfigPath = Join-Path $AppDataDir "rclone.conf"

            Write-InstallerLog "ps1 install: config template=$configTemplate"
            Write-InstallerLog "ps1 install: rclone template=$rcloneTemplate"

            Ensure-ConfigFile -TemplatePath $configTemplate -DestinationPath $configPath
            Write-InstallerLog "ps1 install: ensured config=$configPath"

            Ensure-ConfigFile -TemplatePath $rcloneTemplate -DestinationPath $rcloneConfigPath
            Write-InstallerLog "ps1 install: ensured rclone config=$rcloneConfigPath"

            Register-ContextMenu -ExePath $ExecutablePath
            Write-InstallerLog "ps1 install: registered context menu"
            Write-InstallerLog "ps1 install: completed"
        }

        "unregister-menu" {
            Write-UninstallerLog "ps1 unregister-menu: begin"
            Unregister-ContextMenu
            Write-UninstallerLog "ps1 unregister-menu: completed"
        }

        "remove-files" {
            Write-UninstallerLog "ps1 remove-files: begin"
            Write-UninstallerLog "ps1 remove-files: InstallDir=$InstallDir"
            Write-UninstallerLog "ps1 remove-files: Updated=$Updated"
            Write-UninstallerLog "ps1 remove-files: UninstallerName=$UninstallerName"
            Remove-InstallFiles -TargetDir $InstallDir -CurrentUninstallerName $UninstallerName -IsUpdated ([bool]$Updated)
            Write-UninstallerLog "ps1 remove-files: completed"
        }

        "prepare-upgrade" {
            Write-InstallerLog "ps1 prepare-upgrade: begin"
            Write-InstallerLog "ps1 prepare-upgrade: InstallDir=$InstallDir"
            Write-InstallerLog "ps1 prepare-upgrade: InstallRegistryKey=$InstallRegistryKey"
            Write-InstallerLog "ps1 prepare-upgrade: UninstallRegistryKey=$UninstallRegistryKey"
            Unregister-ContextMenu
            Write-InstallerLog "ps1 prepare-upgrade: unregistered context menu"
            Clear-InstallDirectory -TargetDir $InstallDir
            Write-InstallerLog "ps1 prepare-upgrade: cleared install directory"
            Remove-RegistryKeyIfPresent -RegistryKey $InstallRegistryKey
            Write-InstallerLog "ps1 prepare-upgrade: removed install registry key"
            Remove-RegistryKeyIfPresent -RegistryKey $UninstallRegistryKey
            Write-InstallerLog "ps1 prepare-upgrade: removed uninstall registry key"
            Write-InstallerLog "ps1 prepare-upgrade: completed"
        }
    }

    exit 0
}
catch {
    $message = $_.Exception.Message
    if ($Action -eq "install") {
        Write-InstallerLog "ps1 install: failed: $message"
    }
    else {
        Write-UninstallerLog "ps1 $Action: failed: $message"
    }

    Write-Error $message
    exit 1
}
