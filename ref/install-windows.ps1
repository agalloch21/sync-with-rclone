# ============================================================
#  install-windows.ps1 - Windows Installer for sync-with-remote
# ============================================================
# 
# Usage:
#   1. Open PowerShell as Administrator (for context menu registration/unregistration)
#   2. Navigate to the project directory
#   3. Run:
#      .\install-windows.ps1 [-Action install|uninstall] [-InstallDir "C:\\Path"]
#
#   Examples:
#      .\install-windows.ps1                          # install to %USERPROFILE%\.sync-with-remote
#      .\install-windows.ps1 -InstallDir "C:\\Apps\\Sync"  # install to custom path
#      .\install-windows.ps1 -Action uninstall         # uninstall from default path
#      .\install-windows.ps1 -Action uninstall -InstallDir "C:\\Apps\\Sync" # uninstall from custom path
#
# Note: Administrator privileges are required to register the context menu.
#       If running without admin, the context menu can be registered later
#       by running: .\src\helpers\windows-menu.ps1 -Action install
# ============================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("install", "uninstall")]
    [string]$Action = "install",

    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "$env:USERPROFILE\.sync-with-remote",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipElevation = $false
)

$ErrorActionPreference = "Stop"

# Colors for output (define early for use in elevation check)
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Check if running as administrator
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# If not admin and not skipping elevation, re-launch with admin privileges
if (-not $IsAdmin -and -not $SkipElevation) {
    Write-Info "Administrator privileges required for context menu registration."
    Write-Info "Requesting elevation..."
    Write-Host ""
    
    # Re-launch script with admin privileges
    $ScriptPath = $MyInvocation.MyCommand.Path
    $Arguments = "-ExecutionPolicy Bypass -File `"$ScriptPath`" -Action $Action -InstallDir `"$InstallDir`" -SkipElevation"
    
    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList $Arguments -Wait
        exit $LASTEXITCODE
    } catch {
        Write-Error "Failed to elevate privileges. User may have cancelled the UAC prompt."
        Write-Info "You can still install without context menu registration."
        Write-Info "To register context menu later, run as Administrator:"
        Write-Info "  powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\helpers\windows-menu.ps1`" -Action install"
        Write-Host ""
        # Continue with installation but skip context menu registration
        $SkipElevation = $true
    }
}

Write-Info "========================================="
Write-Info "sync-with-remote Windows Installer"
Write-Info "========================================="
Write-Host ""

# Get script directory (where installer is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcDir = Join-Path $ScriptDir "src"

# Check if src directory exists
if (-not (Test-Path $SrcDir)) {
    Write-Error "Source directory not found: $SrcDir"
    Write-Error "Please ensure you're running the installer from the project root."
    exit 1
}

# Check PowerShell version
$PSVersion = $PSVersionTable.PSVersion
if ($PSVersion.Major -lt 5 -or ($PSVersion.Major -eq 5 -and $PSVersion.Minor -lt 1)) {
    Write-Error "PowerShell 5.1 or higher is required."
    Write-Error "Current version: $($PSVersion.ToString())"
    exit 1
}

Write-Info "PowerShell version: $($PSVersion.ToString())"
Write-Host ""

# Handle uninstall early
if ($Action -eq "uninstall") {
    Write-Info "Action: uninstall"
    Write-Info "Target directory: $InstallDir"
    Write-Host ""

    # Unregister context menu (requires admin)
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    $MenuScript = Join-Path $InstallDir "helpers\windows-menu.ps1"
    if (Test-Path $MenuScript) {
        if ($IsAdmin) {
            Write-Info "Unregistering context menu..."
            try {
                $MenuScriptArgs = "-ExecutionPolicy Bypass -File `"$MenuScript`" -Action uninstall -InstallDir `"$InstallDir`""
                $Result = Start-Process powershell.exe -ArgumentList $MenuScriptArgs -Wait -PassThru -NoNewWindow
                if ($Result.ExitCode -eq 0) {
                    Write-Success "Context menu unregistered successfully!"
                } else {
                    Write-Warn "Context menu unregistration may have failed (exit code: $($Result.ExitCode))"
                }
            } catch {
                Write-Warn "Failed to unregister context menu: $_"
            }
        } else {
            Write-Warn "Administrator privileges required to unregister context menu."
            Write-Warn "To unregister manually, run as Administrator:"
            Write-Warn "  powershell.exe -ExecutionPolicy Bypass -File `"$MenuScript`" -Action uninstall"
        }
    } else {
        Write-Info "Context menu script not found at: $MenuScript (continuing)."
    }

    # Remove installation directory
    if (Test-Path $InstallDir) {
        try {
            Write-Info "Removing installation directory..."
            Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction Stop
            Write-Success "Removed: $InstallDir"
        } catch {
            Write-Warn "Failed to remove $InstallDir automatically: $_"
        }
    } else {
        Write-Info "Installation directory not found: $InstallDir"
    }

    Write-Success "========================================="
    Write-Success "Uninstallation completed!"
    Write-Success "========================================="
    return
}

# Step 1: Verify build prerequisites
Write-Info "Step 1: Checking prerequisites..."
Write-Info "Note: The executable is self-contained and includes rclone binary"
Write-Info "No separate rclone installation is needed."
Write-Host ""

# Step 2: Create installation directory
Write-Info "Step 2: Creating installation directory..."
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Success "Created directory: $InstallDir"
} else {
    Write-Info "Installation directory already exists: $InstallDir"
}
Write-Host ""

# Step 3: Copy executable and helper files to installation directory
Write-Info "Step 3: Copying files..."
$DistDir = Join-Path $ScriptDir "dist"
$ExecutableName = "sync-with-remote-win.exe"
$ExecutableSrc = Join-Path $DistDir $ExecutableName
$ExecutableDst = Join-Path $InstallDir $ExecutableName

# Check if executable exists in dist/
if (-not (Test-Path $ExecutableSrc)) {
    Write-Error "Executable not found: $ExecutableSrc"
    Write-Error "Please build the executable first by running: npm run build:win"
    Write-Error "Or build all platforms: npm run build"
    exit 1
}

# Copy executable
Copy-Item -Path $ExecutableSrc -Destination $ExecutableDst -Force
Write-Success "Copied executable: $ExecutableName"

# Copy helper scripts (for context menu registration)
$HelpersDir = Join-Path $InstallDir "helpers"
New-Item -ItemType Directory -Path $HelpersDir -Force | Out-Null

$HelperFiles = @(
    @{Src = "helpers\windows-menu.ps1"; Dst = "helpers\windows-menu.ps1"}
)

foreach ($file in $HelperFiles) {
    $srcPath = Join-Path $SrcDir $file.Src
    $dstPath = Join-Path $InstallDir $file.Dst
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $dstPath -Force
        Write-Info "  Copied: $($file.Dst)"
    } else {
        Write-Warn "  File not found: $srcPath"
    }
}

# Remove legacy PowerShell entry script to avoid accidental usage
$LegacyPs1 = Join-Path $InstallDir "sync-with-remote.ps1"
if (Test-Path $LegacyPs1) {
    Write-Info "Removing legacy PowerShell entry script: $LegacyPs1"
    try {
        Remove-Item -Path $LegacyPs1 -Force
        Write-Info "  Removed legacy script"
    } catch {
        Write-Warn "  Could not remove legacy script automatically: $_"
    }
}

Write-Host ""

# Step 4: Setup config file
Write-Info "Step 4: Setting up configuration file..."
$ConfigFile = Join-Path $InstallDir "config.json"
$WinTemplate = Join-Path $ScriptDir "templates\config.json.win.example"
$GenericTemplate = Join-Path $ScriptDir "templates\config.json.example"
$TemplateFile = $null

if (Test-Path $WinTemplate) {
    $TemplateFile = $WinTemplate
} elseif (Test-Path $GenericTemplate) {
    $TemplateFile = $GenericTemplate
}

if (-not (Test-Path $ConfigFile)) {
    if ($TemplateFile) {
        Copy-Item -Path $TemplateFile -Destination $ConfigFile
        Write-Success "Created config file from template: $ConfigFile"
        Write-Warn "Please edit config.json to configure your rclone remotes and sync jobs."
    } else {
        # Create a basic config if template doesn't exist
        $BasicConfig = @{
            globalFilterPatterns = @(".DS_Store", "Thumbs.db", ".git")
            mappings = @()
        } | ConvertTo-Json -Depth 10
        $BasicConfig | Out-File -FilePath $ConfigFile -Encoding utf8
        Write-Success "Created basic config file: $ConfigFile"
    }
} else {
    Write-Info "Config file already exists: $ConfigFile"
}
Write-Host ""

# Step 5: Verify executable
Write-Info "Step 5: Verifying executable..."
if (Test-Path $ExecutableDst) {
    Write-Success "Executable verified: $ExecutableDst"
    Write-Info "The executable is self-contained and includes:"
    Write-Info "  - Node.js runtime (bundled)"
    Write-Info "  - All dependencies (bundled)"
    Write-Info "  - Rclone binary (embedded, extracts at runtime)"
    Write-Info "  - Git-compatible .gitignore support (built-in)"
} else {
    Write-Error "Executable not found at destination: $ExecutableDst"
    exit 1
}
Write-Host ""

# Step 6: Check rclone configuration
Write-Info "Step 6: Checking rclone configuration..."
Write-Info "Note: The executable includes rclone binary (no separate installation needed)"
Write-Info "However, you still need to configure rclone remotes."

# Try to check for rclone config using the bundled executable
$RcloneConfigPath = "$env:APPDATA\rclone\rclone.conf"
if (Test-Path $RcloneConfigPath) {
    Write-Success "Found rclone config file: $RcloneConfigPath"
    Write-Info "You can test remotes by running: $ExecutableName --help"
} else {
    Write-Warn "Rclone config file not found: $RcloneConfigPath"
    Write-Warn "To configure remotes, you can:"
    Write-Warn "  1. Use the bundled rclone (extracts automatically when needed)"
    Write-Warn "  2. Or install rclone separately and run 'rclone config'"
    Write-Warn "  3. The config file will be created at: $RcloneConfigPath"
}
Write-Host ""

# Step 7: Register context menu (requires admin)
Write-Info "Step 7: Context menu registration..."
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($IsAdmin) {
    $MenuScript = Join-Path $InstallDir "helpers\windows-menu.ps1"
    if (Test-Path $MenuScript) {
        Write-Info "Registering context menu..."
        try {
            # Use Bypass execution policy to avoid script execution errors
            $MenuScriptArgs = "-ExecutionPolicy Bypass -File `"$MenuScript`" -Action install -InstallDir `"$InstallDir`""
            $Result = Start-Process powershell.exe -ArgumentList $MenuScriptArgs -Wait -PassThru -NoNewWindow
            if ($Result.ExitCode -eq 0) {
                Write-Success "Context menu registered successfully!"
            } else {
                Write-Warn "Context menu registration may have failed (exit code: $($Result.ExitCode))"
            }
        } catch {
            Write-Warn "Failed to register context menu: $_"
            Write-Warn "You can register it manually later by running as Administrator:"
            Write-Warn "  powershell.exe -ExecutionPolicy Bypass -File `"$MenuScript`" -Action install"
        }
    } else {
        Write-Warn "Context menu script not found: $MenuScript"
    }
} else {
    Write-Warn "Administrator privileges not available. Context menu registration skipped."
    Write-Warn "To register manually, run as Administrator:"
    Write-Warn "  powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\helpers\windows-menu.ps1`" -Action install"
}
Write-Host ""

# Summary
Write-Success "========================================="
Write-Success "Installation completed!"
Write-Success "========================================="
Write-Host ""
Write-Info "Installation directory: $InstallDir"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  1. Edit config.json to configure your sync jobs"
Write-Info "  2. Configure rclone remotes (the executable includes rclone)"
Write-Info "  3. Test the executable: .\$ExecutableName --help"
Write-Info "  4. Use the context menu (right-click on folders) or run from command line"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
