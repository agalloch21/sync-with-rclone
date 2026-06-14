#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("install", "register-menu", "unregister-menu", "remove-files")]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "",

    [Parameter(Mandatory = $false)]
    [Alias("AppDataDir")]
    [string]$ConfigDir = "",

    [Parameter(Mandatory = $false)]
    [string]$ExecutablePath = "",

    [Parameter(Mandatory = $false)]
    [string]$ResourcesDir = "",

    [Parameter(Mandatory = $false)]
    [string]$UninstallerName = "",

    [Parameter(Mandatory = $false)]
    [switch]$Updated,

    [Parameter(Mandatory = $false)]
    [switch]$Elevated
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

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-ScriptPath {
    if (-not [string]::IsNullOrWhiteSpace($PSCommandPath)) {
        return $PSCommandPath
    }

    if (-not [string]::IsNullOrWhiteSpace($MyInvocation.MyCommand.Path)) {
        return $MyInvocation.MyCommand.Path
    }

    throw "Unable to resolve installer script path for elevation."
}

function Invoke-ElevatedSelf {
    param(
        [Parameter(Mandatory = $true)][string]$ChildAction
    )

    if ($Elevated) {
        throw "Administrator privileges are required for $ChildAction."
    }

    $scriptPath = Get-ScriptPath
    $argumentList = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $scriptPath,
        '-Action', $ChildAction,
        '-Elevated'
    )

    if (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
        $argumentList += @('-InstallDir', $InstallDir)
    }

    if (-not [string]::IsNullOrWhiteSpace($ConfigDir)) {
        $argumentList += @('-ConfigDir', $ConfigDir)
    }

    if (-not [string]::IsNullOrWhiteSpace($ExecutablePath)) {
        $argumentList += @('-ExecutablePath', $ExecutablePath)
    }

    if (-not [string]::IsNullOrWhiteSpace($ResourcesDir)) {
        $argumentList += @('-ResourcesDir', $ResourcesDir)
    }

    if (-not [string]::IsNullOrWhiteSpace($UninstallerName)) {
        $argumentList += @('-UninstallerName', $UninstallerName)
    }

    if ($Updated) {
        $argumentList += '-Updated'
    }

    try {
        Write-InstallerLog "ps1 elevate: action=$ChildAction scriptPath=$scriptPath"
        $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argumentList -Wait -PassThru
        if ($process.ExitCode -ne 0) {
            throw "Elevated $ChildAction failed with exit code $($process.ExitCode)."
        }
    }
    catch {
        throw "Administrator privileges are required to complete $ChildAction. $($_.Exception.Message)"
    }
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-InstallerStateDirectory {
    if (-not [string]::IsNullOrWhiteSpace($env:SYNC_WITH_RCLONE_INSTALLER_STATE_DIR)) {
        return $env:SYNC_WITH_RCLONE_INSTALLER_STATE_DIR
    }

    return Join-Path $env:ProgramData "sync-with-rclone-installer"
}

function Get-ConfigBackupDirectory {
    return Join-Path (Get-InstallerStateDirectory) "config-backup"
}

function Backup-ConfigDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDir
    )

    if (-not (Test-Path -LiteralPath $SourceDir)) {
        return
    }

    $backupDir = Get-ConfigBackupDirectory
    $stateDir = Split-Path -Parent $backupDir

    Ensure-Directory -Path $stateDir

    if (Test-Path -LiteralPath $backupDir) {
        Remove-Item -LiteralPath $backupDir -Recurse -Force
    }

    Move-Item -LiteralPath $SourceDir -Destination $backupDir -Force
}

function Restore-ConfigDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$DestinationDir
    )

    $backupDir = Get-ConfigBackupDirectory
    if (-not (Test-Path -LiteralPath $backupDir)) {
        return
    }

    Ensure-Directory -Path $DestinationDir

    Get-ChildItem -LiteralPath $backupDir -Force | ForEach-Object {
        $destinationPath = Join-Path $DestinationDir $_.Name
        if (Test-Path -LiteralPath $destinationPath) {
            return
        }

        Move-Item -LiteralPath $_.FullName -Destination $destinationPath -Force
    }

    if (Test-Path -LiteralPath $backupDir) {
        Remove-Item -LiteralPath $backupDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Register-ContextMenu {
    param(
        [Parameter(Mandatory = $true)][string]$ExePath
    )

    $directoryKey = "HKCU:\Software\Classes\Directory\shell\sync-with-rclone"
    $backgroundKey = "HKCU:\Software\Classes\Directory\Background\shell\sync-with-rclone"
    $iconValue = $ExePath

    foreach ($rootKey in @($directoryKey, $backgroundKey)) {
        New-Item -Path $rootKey -Force | Out-Null
        New-ItemProperty -Path $rootKey -Name "MUIVerb" -Value "sync-with-rclone" -PropertyType String -Force | Out-Null
        New-ItemProperty -Path $rootKey -Name "SubCommands" -Value ([string]::Empty) -PropertyType String -Force | Out-Null
        New-ItemProperty -Path $rootKey -Name "Icon" -Value $iconValue -PropertyType String -Force | Out-Null
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
            $command = "`"$ExePath`" --session --mode=$mode --local `"$($target.ArgumentToken)`""

            New-Item -Path $menuKey -Force | Out-Null
            New-ItemProperty -Path $menuKey -Name "MUIVerb" -Value $label -PropertyType String -Force | Out-Null
            New-ItemProperty -Path $menuKey -Name "Icon" -Value $iconValue -PropertyType String -Force | Out-Null
            New-Item -Path $commandKey -Force | Out-Null
            Set-ItemProperty -Path $commandKey -Name "(default)" -Value $command -Force
        }
    }
}

function Unregister-ContextMenu {
    foreach ($key in @(
        "HKCU:\Software\Classes\Directory\shell\sync-with-rclone",
        "HKCU:\Software\Classes\Directory\Background\shell\sync-with-rclone"
    )) {
        if (Test-Path -LiteralPath $key) {
            Remove-Item -LiteralPath $key -Recurse -Force
        }
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

    if ($IsUpdated) {
        Backup-ConfigDirectory -SourceDir (Join-Path $TargetDir "config")
    }

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
            Write-InstallerLog "ps1 install: begin"
            Write-InstallerLog "ps1 install: InstallDir=$InstallDir"
            Write-InstallerLog "ps1 install: ConfigDir=$ConfigDir"
            Write-InstallerLog "ps1 install: ResourcesDir=$ResourcesDir"
            Ensure-Directory -Path $ConfigDir
            Restore-ConfigDirectory -DestinationDir $ConfigDir

            Write-InstallerLog "ps1 install: config.json is initialized by the app when missing"
            Write-InstallerLog "ps1 install: rclone config is managed by rclone and was not initialized"
            if ($env:SYNC_WITH_RCLONE_SKIP_MENU_REGISTRATION -eq "1") {
                Write-InstallerLog "ps1 install: skipped context menu registration"
            }
            elseif (Test-IsAdministrator) {
                Register-ContextMenu -ExePath $ExecutablePath
                Write-InstallerLog "ps1 install: registered context menu"
            }
            else {
                Write-InstallerLog "ps1 install: requesting elevation for context menu registration"
                Invoke-ElevatedSelf -ChildAction "register-menu"
                Write-InstallerLog "ps1 install: registered context menu via elevated helper"
            }

            Write-InstallerLog "ps1 install: completed"
        }

        "register-menu" {
            Write-InstallerLog "ps1 register-menu: begin"
            if (-not (Test-IsAdministrator)) {
                throw "Administrator privileges are required for register-menu."
            }

            Register-ContextMenu -ExePath $ExecutablePath
            Write-InstallerLog "ps1 register-menu: completed"
        }

        "unregister-menu" {
            Write-UninstallerLog "ps1 unregister-menu: begin"
            if (Test-IsAdministrator) {
                Unregister-ContextMenu
            }
            else {
                Invoke-ElevatedSelf -ChildAction "unregister-menu"
            }
            Write-UninstallerLog "ps1 unregister-menu: completed"
        }

        "remove-files" {
            Write-UninstallerLog "ps1 remove-files: begin"
            Remove-InstallFiles -TargetDir $InstallDir -CurrentUninstallerName $UninstallerName -IsUpdated ([bool]$Updated)
            Write-UninstallerLog "ps1 remove-files: completed"
        }
    }

    exit 0
}
catch {
    if ($Action -eq "install") {
        Write-InstallerLog "ps1 install: failed: $($_.Exception.Message)"
    }
    else {
        Write-UninstallerLog "ps1 ${Action}: failed: $($_.Exception.Message)"
    }
    Write-Error $_.Exception.Message
    exit 1
}
