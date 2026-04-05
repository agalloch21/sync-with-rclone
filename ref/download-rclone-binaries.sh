#!/bin/bash
# Download rclone binaries for all platforms

set -e

BINARIES_DIR="resources/binaries"
mkdir -p "$BINARIES_DIR"

echo "Downloading rclone binaries..."

# Windows
echo "Downloading Windows binary..."
curl -L -o "$BINARIES_DIR/rclone-windows-amd64.exe" \
  "https://downloads.rclone.org/rclone-current-windows-amd64.zip" || {
  echo "Failed to download Windows binary"
  exit 1
}
unzip -q -j "$BINARIES_DIR/rclone-windows-amd64.exe" "rclone-*-windows-amd64/rclone.exe" -d "$BINARIES_DIR" && \
mv "$BINARIES_DIR/rclone.exe" "$BINARIES_DIR/rclone-windows-amd64.exe" || {
  echo "Failed to extract Windows binary"
  exit 1
}

# macOS
echo "Downloading macOS binary..."
curl -L -o "$BINARIES_DIR/rclone-darwin-amd64.zip" \
  "https://downloads.rclone.org/rclone-current-osx-amd64.zip" || {
  echo "Failed to download macOS binary"
  exit 1
}
unzip -q -j "$BINARIES_DIR/rclone-darwin-amd64.zip" "rclone-*-osx-amd64/rclone" -d "$BINARIES_DIR" && \
mv "$BINARIES_DIR/rclone" "$BINARIES_DIR/rclone-darwin-amd64" && \
chmod +x "$BINARIES_DIR/rclone-darwin-amd64" || {
  echo "Failed to extract macOS binary"
  exit 1
}

# Linux
echo "Downloading Linux binary..."
curl -L -o "$BINARIES_DIR/rclone-linux-amd64.zip" \
  "https://downloads.rclone.org/rclone-current-linux-amd64.zip" || {
  echo "Failed to download Linux binary"
  exit 1
}
unzip -q -j "$BINARIES_DIR/rclone-linux-amd64.zip" "rclone-*-linux-amd64/rclone" -d "$BINARIES_DIR" && \
mv "$BINARIES_DIR/rclone" "$BINARIES_DIR/rclone-linux-amd64" && \
chmod +x "$BINARIES_DIR/rclone-linux-amd64" || {
  echo "Failed to extract Linux binary"
  exit 1
}

# Cleanup zip files
rm -f "$BINARIES_DIR"/*.zip

echo "✅ All rclone binaries downloaded successfully!"
echo "Binaries are in: $BINARIES_DIR"

