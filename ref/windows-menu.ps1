# Windows Context Menu Registration Script
# Registers/unregisters context menu entries for sync-with-remote

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("install", "uninstall")]
    [string]$Action,
    
    [Parameter(Mandatory=$true)]
    [string]$InstallDir
)

$ErrorActionPreference = "Stop"

# Registry keys for context menu
$ContextMenuKey = "HKCU:\Software\Classes\Directory\shell\SyncWithRemote"
$UploadCmdKey = "$ContextMenuKey\command"
$UploadAsCmdKey = "$ContextMenuKey\UploadAs\command"
$PullCmdKey = "$ContextMenuKey\Pull\command"
$PullFromCmdKey = "$ContextMenuKey\PullFrom\command"

# Get executable path
$ExePath = Join-Path $InstallDir "sync-with-remote-win.exe"
if (-not (Test-Path $ExePath)) {
    # Try alternative name
    $ExePath = Join-Path $InstallDir "sync-with-remote.exe"
}

function Register-ContextMenu {
    Write-Host "[INFO] Registering Windows context menu..." -ForegroundColor Cyan
    
    if (-not (Test-Path $ExePath)) {
        Write-Host "[ERROR] Executable not found: $ExePath" -ForegroundColor Red
        exit 1
    }
    
    # Create main menu entry
    New-Item -Path $ContextMenuKey -Force | Out-Null
    Set-ItemProperty -Path $ContextMenuKey -Name "MUIVerb" -Value "Sync with Remote" -Type String
    Set-ItemProperty -Path $ContextMenuKey -Name "SubCommands" -Value "" -Type String
    
    # Upload command
    New-Item -Path $UploadCmdKey -Force | Out-Null
    $UploadCmd = "`"$ExePath`" --mode=upload --folder=`"%1`""
    Set-ItemProperty -Path $UploadCmdKey -Name "(default)" -Value $UploadCmd -Type String
    
    # Upload As command
    New-Item -Path $UploadAsCmdKey -Force | Out-Null
    $UploadAsCmd = "`"$ExePath`" --mode=upload-as --folder=`"%1`""
    Set-ItemProperty -Path $UploadAsCmdKey -Name "(default)" -Value $UploadAsCmd -Type String
    
    # Pull command
    New-Item -Path $PullCmdKey -Force | Out-Null
    $PullCmd = "`"$ExePath`" --mode=pull --folder=`"%1`""
    Set-ItemProperty -Path $PullCmdKey -Name "(default)" -Value $PullCmd -Type String
    
    # Pull From command
    New-Item -Path $PullFromCmdKey -Force | Out-Null
    $PullFromCmd = "`"$ExePath`" --mode=pull-from --folder=`"%1`""
    Set-ItemProperty -Path $PullFromCmdKey -Name "(default)" -Value $PullFromCmd -Type String
    
    Write-Host "[SUCCESS] Context menu registered successfully!" -ForegroundColor Green
    Write-Host "[INFO] Right-click on any folder to see 'Sync with Remote' options" -ForegroundColor Cyan
}

function Unregister-ContextMenu {
    Write-Host "[INFO] Unregistering Windows context menu..." -ForegroundColor Cyan
    
    if (Test-Path $ContextMenuKey) {
        Remove-Item -Path $ContextMenuKey -Recurse -Force
        Write-Host "[SUCCESS] Context menu unregistered successfully!" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Context menu not found (may already be unregistered)" -ForegroundColor Yellow
    }
}

# Main execution
try {
    switch ($Action) {
        "install" {
            Register-ContextMenu
        }
        "uninstall" {
            Unregister-ContextMenu
        }
    }
} catch {
    Write-Host "[ERROR] Failed to $Action context menu: $_" -ForegroundColor Red
    exit 1
}

