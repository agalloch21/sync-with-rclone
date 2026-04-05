#!/bin/bash
# ============================================================
#  macos-menu.sh - macOS Context Menu Registration
#  Creates Automator Quick Actions for folder sync operations
# ============================================================

set -uo pipefail

ACTION="${1:-install}"
INSTALL_DIR="${2:-$HOME/.sync-with-remote}"

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

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    error "This script is for macOS only."
    exit 1
fi

# Services directory (Quick Actions)
SERVICES_DIR="$HOME/Library/Services"

# Prefer built binaries over legacy shell entry scripts
EXECUTABLE=""
CANDIDATES=(
    "$INSTALL_DIR/sync-with-remote-macos-arm64"
    "$INSTALL_DIR/sync-with-remote-macos-amd64"
    "$INSTALL_DIR/sync-with-remote-macos"
    "$INSTALL_DIR/sync-with-remote"
    "$INSTALL_DIR/sync-with-remote.sh"
)
for candidate in "${CANDIDATES[@]}"; do
    if [ -f "$candidate" ]; then
        EXECUTABLE="$candidate"
        break
    fi
done

if [[ "$ACTION" == "install" ]]; then
    info "Installing macOS context menu entries..."
    
    # Check if executable exists
    if [ -z "$EXECUTABLE" ]; then
        error "sync-with-remote executable not found in $INSTALL_DIR"
        error "Please run the installer first or specify the correct InstallDir."
        exit 1
    fi
    
    # Ensure executable has execute permissions
    chmod +x "$EXECUTABLE"
    
    # Create Services directory if it doesn't exist
    mkdir -p "$SERVICES_DIR"
    
    # Function to create an Automator workflow
    create_workflow() {
        local workflow_name="$1"
        local mode="$2"
        local needs_remote_path="${3:-false}"
        local workflow_path="$SERVICES_DIR/$workflow_name.workflow"
        
        # Remove existing workflow if it exists
        rm -rf "$workflow_path"
        
        # Create workflow directory structure
        mkdir -p "$workflow_path/Contents"
        
        # Create Info.plist
        cat > "$workflow_path/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.rclone-sync.$workflow_name</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$workflow_name</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSServices</key>
    <array>
        <dict>
            <key>NSMenuItem</key>
            <dict>
                <key>default</key>
                <string>$workflow_name</string>
            </dict>
            <key>NSMessage</key>
            <string>runWorkflowAsService</string>
            <key>NSRequiredContext</key>
            <dict>
                <key>NSApplicationIdentifier</key>
                <string>com.apple.finder</string>
            </dict>
            <key>NSSendFileTypes</key>
            <array>
                <string>public.folder</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
EOF
        
        # Create document.wflow (Automator workflow document)
        # Use the modern format that matches working Automator workflows
        if [[ "$needs_remote_path" == "true" ]]; then
            # For modes that need remote path input, use AppleScript to prompt
            cat > "$workflow_path/Contents/document.wflow" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>528</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>#!/bin/bash
# Set up PATH to include common locations for rclone
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"

# Set up environment for rclone
# Ensure HOME is set (Automator might not have it)
# Use getent or whoami to get the actual home directory if HOME is not set
if [ -z "\${HOME:-}" ]; then
    export HOME=\$(getent passwd "\$(whoami)" | cut -d: -f6 2>/dev/null || echo ~)
fi
# Let rclone find its config file automatically
# Don't set RCLONE_CONFIG - rclone will automatically look in ~/.config/rclone/rclone.conf
# This works better with Full Disk Access permissions
if [ -z "\${RCLONE_CONFIG:-}" ]; then
    # Only set it if we can verify the file exists (for debugging)
    # But rclone will find it automatically anyway
    if [ -f "\$HOME/.config/rclone/rclone.conf" ]; then
        export RCLONE_CONFIG="\$HOME/.config/rclone/rclone.conf"
    fi
fi

# Log file for debugging
LOG_FILE="\$HOME/.sync-with-remote/sync.log"
mkdir -p "\$(dirname "\$LOG_FILE")"

# Debug: log environment
echo "\$(date '+%Y-%m-%d %H:%M:%S') - Environment check" >> "\$LOG_FILE"
echo "  HOME: \$HOME" >> "\$LOG_FILE"
echo "  RCLONE_CONFIG: \$RCLONE_CONFIG" >> "\$LOG_FILE"
echo "  User: \$(whoami)" >> "\$LOG_FILE"
echo "  rclone location: \$(which rclone)" >> "\$LOG_FILE"
# Test if we can access the config file
if [ -f "\$RCLONE_CONFIG" ]; then
    echo "  RCLONE_CONFIG exists: yes" >> "\$LOG_FILE"
    echo "  RCLONE_CONFIG permissions: \$(ls -l \"\$RCLONE_CONFIG\" 2&gt;&amp;1 | awk '{print \$1}')" >> "\$LOG_FILE"
else
    echo "  RCLONE_CONFIG exists: no" >> "\$LOG_FILE"
    echo "  RCLONE_CONFIG path tested: \$RCLONE_CONFIG" >> "\$LOG_FILE"
    # Try to find where rclone actually looks for config
    echo "  rclone config file location: \$(rclone config file 2&gt;&amp;1 | tail -1)" >> "\$LOG_FILE"
fi

# Log the execution
echo "\$(date '+%Y-%m-%d %H:%M:%S') - Starting sync workflow (with remote path)" >> "\$LOG_FILE"
echo "  Mode: $mode" >> "\$LOG_FILE"
echo "  Arguments received: \$@" >> "\$LOG_FILE"
echo "  First argument: \$1" >> "\$LOG_FILE"

# Handle folder path - Automator may pass it in different ways
FOLDER_PATH="\$1"
if [ -z "\$FOLDER_PATH" ]; then
    # Try reading from stdin if no argument
    FOLDER_PATH=\$(cat)
fi

# Convert to absolute path if it's a relative path
if [ -n "\$FOLDER_PATH" ] &amp;&amp; [ -d "\$FOLDER_PATH" ]; then
    FOLDER_PATH=\$(cd "\$FOLDER_PATH" &amp;&amp; pwd)
    echo "  Resolved folder path: \$FOLDER_PATH" >> "\$LOG_FILE"
else
    echo "  ERROR: Folder path is empty or doesn't exist: \$FOLDER_PATH" >> "\$LOG_FILE"
    osascript -e "display dialog \"Error: Could not determine folder path. Check log at: \$LOG_FILE\" buttons {\"OK\"} default button \"OK\" with icon stop"
    exit 1
fi

# Prompt for remote path
REMOTE_PATH=\$(osascript -e 'text returned of (display dialog "Enter remote path:" default answer "" with title "Sync to Remote")')
if [ -z "\$REMOTE_PATH" ]; then
    echo "  ERROR: Remote path was cancelled or empty" >> "\$LOG_FILE"
    osascript -e 'display dialog "Remote path is required." buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

echo "  Remote path: \$REMOTE_PATH" >> "\$LOG_FILE"

# Execute the sync executable
"$EXECUTABLE" --mode=$mode --folder="\$FOLDER_PATH" --remote-path="\$REMOTE_PATH" >> "\$LOG_FILE" 2&gt;&amp;1
EXIT_CODE=\$?

if [ \$EXIT_CODE -ne 0 ]; then
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - Sync failed with exit code \$EXIT_CODE" >> "\$LOG_FILE"
    osascript -e "display dialog \"Sync failed. Check log at: \$LOG_FILE\" buttons {\"OK\"} default button \"OK\" with icon stop"
else
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - Sync completed successfully" >> "\$LOG_FILE"
fi

exit \$EXIT_CODE</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>AAE616D9-3439-4404-8EEB-15DC6FA468BB</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Command</string>
					<string>Run</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>1D49E798-009F-47C4-9963-5C47C9AE6037</string>
				<key>UUID</key>
				<string>1275DB1E-0432-4F7F-950B-6BF4901E7DDD</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>/System/Library/CoreServices/Finder.app</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>applicationPaths</key>
		<array>
			<string>/System/Library/CoreServices/Finder.app</string>
		</array>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>presentationMode</key>
		<integer>15</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.finder</string>
		<key>serviceApplicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<integer>0</integer>
		<key>systemImageName</key>
		<string>NSActionTemplate</string>
		<key>useAutomaticInputType</key>
		<integer>0</integer>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
EOF
        else
            # Simple workflow without remote path input
            cat > "$workflow_path/Contents/document.wflow" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>528</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>#!/bin/bash
# Set up PATH to include common locations for rclone
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"

# Set up HOME if not set
if [ -z "\${HOME:-}" ]; then
    export HOME=\$(getent passwd "\$(whoami)" | cut -d: -f6 2>/dev/null || echo ~)
fi

# Log file for errors
LOG_FILE="\$HOME/.sync-with-remote/sync.log"
mkdir -p "\$(dirname "\$LOG_FILE")"

# Handle folder path
FOLDER_PATH="\$1"
if [ -z "\$FOLDER_PATH" ] || [ ! -d "\$FOLDER_PATH" ]; then
    osascript -e "display dialog \"Error: Invalid folder path.\" buttons {\"OK\"} default button \"OK\" with icon stop"
    exit 1
fi

# Convert to absolute path
FOLDER_PATH=\$(cd "\$FOLDER_PATH" &amp;&amp; pwd)

# Execute the sync executable
"$EXECUTABLE" --mode=$mode --folder="\$FOLDER_PATH" >> "\$LOG_FILE" 2&gt;&amp;1
EXIT_CODE=\$?

if [ \$EXIT_CODE -ne 0 ]; then
    osascript -e "display dialog \"Sync failed. Check log at: \$LOG_FILE\" buttons {\"OK\"} default button \"OK\" with icon stop"
fi

exit \$EXIT_CODE</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>AAE616D9-3439-4404-8EEB-15DC6FA468BB</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Command</string>
					<string>Run</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>1D49E798-009F-47C4-9963-5C47C9AE6037</string>
				<key>UUID</key>
				<string>1275DB1E-0432-4F7F-950B-6BF4901E7DDD</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>/System/Library/CoreServices/Finder.app</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>applicationPaths</key>
		<array>
			<string>/System/Library/CoreServices/Finder.app</string>
		</array>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>presentationMode</key>
		<integer>15</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.finder</string>
		<key>serviceApplicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<integer>0</integer>
		<key>systemImageName</key>
		<string>NSActionTemplate</string>
		<key>useAutomaticInputType</key>
		<integer>0</integer>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
EOF
        fi
        
        info "  Created workflow: $workflow_name"
    }
    
    # NOTE: create_workflow function above is kept for reference but no longer used
    # All sync workflows now use create_workflow_terminal for live Terminal output
    
    # Create workflow for opening config file
    create_config_workflow() {
        local workflow_name="$1"
        local workflow_path="$SERVICES_DIR/$workflow_name.workflow"
        
        # Remove existing workflow if it exists
        rm -rf "$workflow_path"
        
        # Create workflow directory structure
        mkdir -p "$workflow_path/Contents"
        
        # Create Info.plist - config workflow doesn't need folder input
        cat > "$workflow_path/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.rclone-sync.$workflow_name</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$workflow_name</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSServices</key>
    <array>
        <dict>
            <key>NSMenuItem</key>
            <dict>
                <key>default</key>
                <string>$workflow_name</string>
            </dict>
            <key>NSMessage</key>
            <string>runWorkflowAsService</string>
            <key>NSRequiredContext</key>
            <dict>
                <key>NSApplicationIdentifier</key>
                <string>com.apple.finder</string>
            </dict>
            <key>NSSendFileTypes</key>
            <array>
                <string>public.folder</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
EOF
        
        # Create document.wflow for opening config file
        cat > "$workflow_path/Contents/document.wflow" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>528</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>#!/bin/bash
# Open config.json file with default text editor
CONFIG_FILE="$INSTALL_DIR/config.json"
open -a TextEdit "\$CONFIG_FILE" 2>/dev/null || open "\$CONFIG_FILE"</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>0</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>AAE616D9-3439-4404-8EEB-15DC6FA468BB</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Command</string>
					<string>Run</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>1D49E798-009F-47C4-9963-5C47C9AE6037</string>
				<key>UUID</key>
				<string>1275DB1E-0432-4F7F-950B-6BF4901E7DDD</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>/System/Library/CoreServices/Finder.app</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>applicationPaths</key>
		<array>
			<string>/System/Library/CoreServices/Finder.app</string>
		</array>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>presentationMode</key>
		<integer>15</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.finder</string>
		<key>serviceApplicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<integer>0</integer>
		<key>systemImageName</key>
		<string>NSActionTemplate</string>
		<key>useAutomaticInputType</key>
		<integer>0</integer>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
EOF
        
        info "  Created workflow: $workflow_name"
    }
    
    # Terminal-enabled workflow creator for live output in Terminal.app
    create_workflow_terminal() {
        local workflow_name="$1"
        local mode="$2"
        local needs_remote_path="${3:-false}"
        local workflow_path="$SERVICES_DIR/$workflow_name.workflow"

        rm -rf "$workflow_path"
        mkdir -p "$workflow_path/Contents"

        # Info.plist
        cat > "$workflow_path/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.rclone-sync.$workflow_name</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$workflow_name</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSServices</key>
    <array>
        <dict>
            <key>NSMenuItem</key>
            <dict>
                <key>default</key>
                <string>$workflow_name</string>
            </dict>
            <key>NSMessage</key>
            <string>runWorkflowAsService</string>
            <key>NSRequiredContext</key>
            <dict>
                <key>NSApplicationIdentifier</key>
                <string>com.apple.finder</string>
            </dict>
            <key>NSSendFileTypes</key>
            <array>
                <string>public.folder</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
EOF

        # document.wflow with Terminal output
        # Build command string with proper escaping for XML plist
        # We need: shell $vars escaped as \$, and & escaped as &amp; for XML
        local cmd_script
        if [[ "$needs_remote_path" == "true" ]]; then
            cmd_script='#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if [ -z "${HOME:-}" ]; then
    export HOME=~
fi

LOG_FILE="$HOME/.sync-with-remote/sync.log"
mkdir -p "$(dirname "$LOG_FILE")"

FOLDER_PATH="$1"
if [ -z "$FOLDER_PATH" ]; then
    FOLDER_PATH=$(cat)
fi
if [ -n "$FOLDER_PATH" ] &amp;&amp; [ -d "$FOLDER_PATH" ]; then
    FOLDER_PATH=$(cd "$FOLDER_PATH" &amp;&amp; pwd)
else
    osascript -e "display dialog \"Error: Could not determine folder path.\" buttons {\"OK\"} default button \"OK\" with icon stop"
    exit 1
fi

REMOTE_PATH=$(osascript -e '"'"'text returned of (display dialog "Enter remote path:" default answer "" with title "Sync to Remote (Terminal)")'"'"')
if [ -z "$REMOTE_PATH" ]; then
    osascript -e '"'"'display dialog "Remote path is required." buttons {"OK"} default button "OK" with icon stop'"'"'
    exit 1
fi

RUNNER="/tmp/swr-run-$$-$(date +%s).sh"
cat &gt; "$RUNNER" &lt;&lt;'"'"'EOSINNER'"'"'
#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
FOLDER="$1"
REMOTE="$2"
LOGFILE="$3"
echo "Starting sync..."
echo "  Mode: %%MODE%%"
echo "  Folder: $FOLDER"
echo "  Remote: $REMOTE"
echo
"%%EXECUTABLE%%" --mode=%%MODE%% --folder="$FOLDER" --remote-path="$REMOTE" 2&gt;&amp;1 | tee -a "$LOGFILE"
EXIT_CODE=${PIPESTATUS[0]}
echo
echo "Log: $LOGFILE"
if [ $EXIT_CODE -eq 0 ]; then
  echo "Completed successfully."
else
  echo "Failed with exit code $EXIT_CODE"
fi
echo
read -n 1 -s -p "Press any key to close..."
exit $EXIT_CODE
EOSINNER
chmod +x "$RUNNER"

osascript -e "tell application \"Terminal\" to activate" \
          -e "tell application \"Terminal\" to do script \"bash '"'"'$RUNNER'"'"' '"'"'$FOLDER_PATH'"'"' '"'"'$REMOTE_PATH'"'"' '"'"'$LOG_FILE'"'"'\""

exit 0'
        else
            cmd_script='#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if [ -z "${HOME:-}" ]; then
    export HOME=~
fi

LOG_FILE="$HOME/.sync-with-remote/sync.log"
mkdir -p "$(dirname "$LOG_FILE")"

FOLDER_PATH="$1"
if [ -z "$FOLDER_PATH" ] || [ ! -d "$FOLDER_PATH" ]; then
    osascript -e "display dialog \"Error: Invalid folder path.\" buttons {\"OK\"} default button \"OK\" with icon stop"
    exit 1
fi
FOLDER_PATH=$(cd "$FOLDER_PATH" &amp;&amp; pwd)

RUNNER="/tmp/swr-run-$$-$(date +%s).sh"
cat &gt; "$RUNNER" &lt;&lt;'"'"'EOSINNER'"'"'
#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
FOLDER="$1"
LOGFILE="$2"
echo "Starting sync..."
echo "  Mode: %%MODE%%"
echo "  Folder: $FOLDER"
echo
"%%EXECUTABLE%%" --mode=%%MODE%% --folder="$FOLDER" 2&gt;&amp;1 | tee -a "$LOGFILE"
EXIT_CODE=${PIPESTATUS[0]}
echo
echo "Log: $LOGFILE"
if [ $EXIT_CODE -eq 0 ]; then
  echo "Completed successfully."
else
  echo "Failed with exit code $EXIT_CODE"
fi
echo
read -n 1 -s -p "Press any key to close..."
exit $EXIT_CODE
EOSINNER
chmod +x "$RUNNER"

osascript -e "tell application \"Terminal\" to activate" \
          -e "tell application \"Terminal\" to do script \"bash '"'"'$RUNNER'"'"' '"'"'$FOLDER_PATH'"'"' '"'"'$LOG_FILE'"'"'\""

exit 0'
        fi

        # Replace placeholders with actual values
        cmd_script="${cmd_script//%%MODE%%/$mode}"
        cmd_script="${cmd_script//%%EXECUTABLE%%/$EXECUTABLE}"

        cat > "$workflow_path/Contents/document.wflow" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>528</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>$cmd_script</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>AAE616D9-3439-4404-8EEB-15DC6FA468BB</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Command</string>
					<string>Run</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>1D49E798-009F-47C4-9963-5C47C9AE6037</string>
				<key>UUID</key>
				<string>1275DB1E-0432-4F7F-950B-6BF4901E7DDD</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>/System/Library/CoreServices/Finder.app</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>applicationPaths</key>
		<array>
			<string>/System/Library/CoreServices/Finder.app</string>
		</array>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>presentationMode</key>
		<integer>15</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.finder</string>
		<key>serviceApplicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<integer>0</integer>
		<key>systemImageName</key>
		<string>NSActionTemplate</string>
		<key>useAutomaticInputType</key>
		<integer>0</integer>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
EOF
        
        info "  Created workflow: $workflow_name"
    }
    
    # Create workflows for each mode with numeric prefixes for ordering
    # All workflows run in Terminal for live output
    create_workflow_terminal "Sync with Remote - 1 Upload" "upload" "false"
    create_workflow_terminal "Sync with Remote - 2 Upload As" "upload-as" "true"
    create_workflow_terminal "Sync with Remote - 3 Pull" "pull" "false"
    create_workflow_terminal "Sync with Remote - 4 Pull From" "pull-from" "true"
    create_config_workflow "Sync with Remote - 5 Open Config"
    
    success "Context menu entries installed successfully!"
    info "Right-click on any folder in Finder to access 'Sync with Remote' options."
    warn "You may need to log out and log back in for the services to appear in the context menu."
    
elif [[ "$ACTION" == "uninstall" ]]; then
    info "Uninstalling macOS context menu entries..."
    
    # Remove current workflows
    rm -rf "$SERVICES_DIR/Sync with Remote - 1 Upload.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 2 Upload As.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 3 Pull.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 4 Pull From.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 5 Open Config.workflow"
    # Remove legacy workflows from previous versions
    rm -rf "$SERVICES_DIR/Sync with Remote - 01 Upload.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 02 Upload As.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 03 Pull.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 04 Pull From.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 05 Open Config.workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 01 Upload (Terminal).workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 02 Upload As (Terminal).workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 03 Pull (Terminal).workflow"
    rm -rf "$SERVICES_DIR/Sync with Remote - 04 Pull From (Terminal).workflow"
    
    success "Context menu entries removed successfully!"
    
else
    error "Invalid action: $ACTION"
    echo "Usage: $0 [install|uninstall] [install-dir]"
    exit 1
fi

