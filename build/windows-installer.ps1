#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("install", "unregister-menu", "remove-files")]
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
    [switch]$Updated
)

$ErrorActionPreference = "Stop"

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

try {
    switch ($Action) {
        "install" {
            Ensure-Directory -Path $AppDataDir

            $configTemplate = Join-Path $ResourcesDir "templates\config.json.win.example"
            $rcloneTemplate = Join-Path $ResourcesDir "templates\rclone.conf.win.example"
            $configPath = Join-Path $AppDataDir "config.json"
            $rcloneConfigPath = Join-Path $AppDataDir "rclone.conf"

            Ensure-ConfigFile -TemplatePath $configTemplate -DestinationPath $configPath
            Ensure-ConfigFile -TemplatePath $rcloneTemplate -DestinationPath $rcloneConfigPath
            Register-ContextMenu -ExePath $ExecutablePath
        }

        "unregister-menu" {
            Unregister-ContextMenu
        }

        "remove-files" {
            Remove-InstallFiles -TargetDir $InstallDir -CurrentUninstallerName $UninstallerName -IsUpdated ([bool]$Updated)
        }
    }

    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
