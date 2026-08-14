#!/bin/bash
# ============================================================
#  install-macos.sh - macOS Installer for sync-with-remote
# ============================================================
#
# Usage:
#   1. Open Terminal
#   2. Navigate to the project directory
#   3. Run:
#      bash install-macos.sh [install|uninstall] [install-dir]
#
#   Examples:
#      bash install-macos.sh                # install to $HOME/.sync-with-remote
#      bash install-macos.sh install ~/dir  # install to ~/dir
#      bash install-macos.sh uninstall      # uninstall from $HOME/.sync-with-remote
#      bash install-macos.sh uninstall ~/dir# uninstall from ~/dir
#
#   Alternative (if you want to make it executable first):
#      chmod +x install-macos.sh
#      ./install-macos.sh
#
# Note: The installer will create Automator workflows for context menu
#       integration. You may need to log out and log back in for the
#       services to appear in Finder's context menu.
# ============================================================

set -uo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info() { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Parse action and install dir
ACTION="install"
INSTALL_DIR="$HOME/.sync-with-remote"

if [ $# -ge 1 ]; then
    case "$1" in
        install|uninstall)
            ACTION="$1"
            if [ $# -ge 2 ]; then
                INSTALL_DIR="$2"
            fi
            ;;
        *)
            # If first arg is not an action, treat it as install dir
            INSTALL_DIR="$1"
            ;;
    esac
fi

info "========================================="
info "sync-with-remote macOS Installer"
info "========================================="
echo ""

# Get script directory (where installer is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"

# Check if src directory exists
if [ ! -d "$SRC_DIR" ]; then
    error "Source directory not found: $SRC_DIR"
    error "Please ensure you're running the installer from the project root."
    exit 1
fi

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    error "This installer is for macOS only."
    exit 1
fi

info "Detected macOS"
echo ""

if [ "$ACTION" = "uninstall" ]; then
    info "Action: uninstall"
    info "Target directory: $INSTALL_DIR"

    # Unregister context menu first
    MENU_SCRIPT="$INSTALL_DIR/helpers/macos-menu.sh"
    if [ -f "$MENU_SCRIPT" ]; then
        info "Unregistering Quick Actions (context menu)..."
        "$MENU_SCRIPT" uninstall "$INSTALL_DIR" || warn "Context menu unregistration reported issues."
    else
        warn "Context menu script not found at $MENU_SCRIPT (continuing)."
    fi

    # Remove install directory
    if [ -d "$INSTALL_DIR" ]; then
        info "Removing installation directory..."
        rm -rf "$INSTALL_DIR"
        success "Removed: $INSTALL_DIR"
    else
        info "Installation directory not found: $INSTALL_DIR"
    fi

    success "========================================="
    success "Uninstallation completed!"
    success "========================================="
    exit 0
fi

# Step 1: Verify build prerequisites
info "Step 1: Checking prerequisites..."
info "Note: The executable is self-contained and includes rclone binary"
info "No separate rclone installation is needed."
echo ""

# Step 2: Create installation directory
info "Step 2: Creating installation directory..."
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    success "Created directory: $INSTALL_DIR"
else
    info "Installation directory already exists: $INSTALL_DIR"
fi
echo ""

# Step 3: Copy executable and helper files to installation directory
info "Step 3: Copying files..."
DIST_DIR="$SCRIPT_DIR/dist"
EXECUTABLE_NAME="sync-with-remote"
EXECUTABLE_DST="$INSTALL_DIR/$EXECUTABLE_NAME"

# Determine best source executable based on architecture and available files
ARCH=$(uname -m)
CANDIDATES=()

if [ "$ARCH" = "arm64" ]; then
    CANDIDATES+=("sync-with-remote-macos-arm64")
fi
CANDIDATES+=("sync-with-remote-macos-amd64" "sync-with-remote")

EXECUTABLE_SRC=""
for candidate in "${CANDIDATES[@]}"; do
    if [ -f "$DIST_DIR/$candidate" ]; then
        EXECUTABLE_SRC="$DIST_DIR/$candidate"
        break
    fi
done

# Check if executable exists in dist/
if [ -z "$EXECUTABLE_SRC" ]; then
    error "Executable not found in dist/. Looked for: ${CANDIDATES[*]}"
    error "Please build the executable first by running: npm run build:mac (or build:mac:arm on Apple Silicon)"
    error "Or build all platforms: npm run build"
    exit 1
fi

# Copy executable
info "Using executable source: $(basename "$EXECUTABLE_SRC")"
cp "$EXECUTABLE_SRC" "$EXECUTABLE_DST"
chmod +x "$EXECUTABLE_DST"
success "Copied executable: $EXECUTABLE_NAME"

# Copy helper scripts (for context menu registration)
HELPERS_DIR="$INSTALL_DIR/helpers"
mkdir -p "$HELPERS_DIR"

HELPER_FILES=(
    "helpers/macos-menu.sh"
)

for file in "${HELPER_FILES[@]}"; do
    SRC_PATH="$SRC_DIR/$file"
    DST_PATH="$INSTALL_DIR/$file"
    if [ -f "$SRC_PATH" ]; then
        cp "$SRC_PATH" "$DST_PATH"
        chmod +x "$DST_PATH"
        info "  Copied: $file"
    else
        warn "  File not found: $SRC_PATH"
    fi
done

# Remove macOS quarantine attributes so executable can run
if command -v xattr &>/dev/null; then
    info "Clearing quarantine attributes..."
    xattr -dr com.apple.quarantine "$INSTALL_DIR" 2>/dev/null || true
fi

echo ""

# Step 4: Setup config file
info "Step 4: Setting up configuration file..."
CONFIG_FILE="$INSTALL_DIR/config.json"
MAC_TEMPLATE="$SCRIPT_DIR/templates/config.json.mac.example"
GENERIC_TEMPLATE="$SCRIPT_DIR/templates/config.json.example"
TEMPLATE_FILE=""

if [ -f "$MAC_TEMPLATE" ]; then
    TEMPLATE_FILE="$MAC_TEMPLATE"
elif [ -f "$GENERIC_TEMPLATE" ]; then
    TEMPLATE_FILE="$GENERIC_TEMPLATE"
fi

if [ ! -f "$CONFIG_FILE" ]; then
    if [ -n "$TEMPLATE_FILE" ]; then
        cp "$TEMPLATE_FILE" "$CONFIG_FILE"
        success "Created config file from template: $CONFIG_FILE"
        warn "Please edit config.json to configure your rclone remotes and sync jobs."
    else
        # Create a basic config if template doesn't exist
        cat > "$CONFIG_FILE" <<'EOF'
{
  "globalFilterPatterns": [
    ".DS_Store",
    "Thumbs.db",
    ".git"
  ],
  "mappings": []
}
EOF
        success "Created basic config file: $CONFIG_FILE"
    fi
else
    info "Config file already exists: $CONFIG_FILE"
fi
echo ""

# Step 5: Verify executable
info "Step 5: Verifying executable..."
if [ -f "$EXECUTABLE_DST" ]; then
    success "Executable verified: $EXECUTABLE_DST"
    info "The executable is self-contained and includes:"
    info "  - Node.js runtime (bundled)"
    info "  - All dependencies (bundled)"
    info "  - Rclone binary (embedded, extracts at runtime)"
    info "  - Git-compatible .gitignore support (built-in)"
else
    error "Executable not found at destination: $EXECUTABLE_DST"
    exit 1
fi
echo ""

# Step 6: Check rclone configuration
info "Step 6: Checking rclone configuration..."
info "Note: The executable includes rclone binary (no separate installation needed)"
info "However, you still need to configure rclone remotes."

# Try to check for rclone config
RCLONE_CONFIG_PATH="$HOME/.config/rclone/rclone.conf"
if [ -f "$RCLONE_CONFIG_PATH" ]; then
    success "Found rclone config file: $RCLONE_CONFIG_PATH"
    info "You can test remotes by running: $EXECUTABLE_NAME --help"
else
    warn "Rclone config file not found: $RCLONE_CONFIG_PATH"
    warn "To configure remotes, you can:"
    warn "  1. Use the bundled rclone (extracts automatically when needed)"
    warn "  2. Or install rclone separately and run 'rclone config'"
    warn "  3. The config file will be created at: $RCLONE_CONFIG_PATH"
fi
echo ""

# Step 7: Register context menu
info "Step 7: Registering context menu..."
MENU_SCRIPT="$INSTALL_DIR/helpers/macos-menu.sh"
if [ -f "$MENU_SCRIPT" ]; then
    info "Registering Quick Actions (context menu)..."
    "$MENU_SCRIPT" install "$INSTALL_DIR"
    if [ $? -eq 0 ]; then
        success "Context menu registered successfully!"
        warn "You may need to log out and log back in for the services to appear in the context menu."
    else
        warn "Context menu registration may have failed. Check output above."
    fi
else
    warn "Context menu script not found: $MENU_SCRIPT"
fi
echo ""

# Summary
success "========================================="
success "Installation completed!"
success "========================================="
echo ""
info "Installation directory: $INSTALL_DIR"
echo ""
info "Next steps:"
info "  1. Edit config.json to configure your sync jobs"
info "  2. Configure rclone remotes (the executable includes rclone)"
info "  3. Test the executable: ./$EXECUTABLE_NAME --help"
info "  4. Use the context menu (right-click on folders in Finder) or run from terminal"
echo ""
