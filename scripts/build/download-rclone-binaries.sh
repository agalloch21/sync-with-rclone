#!/usr/bin/env bash

set -euo pipefail

RCLONE_VERSION="1.71.2"
DOWNLOAD_ROOT="https://downloads.rclone.org/v${RCLONE_VERSION}"
BINARIES_DIR="resources/binaries"
TEMPORARY_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMPORARY_DIR"
}
trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

calculate_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

download_binary() {
  local platform="$1"
  local archive_checksum="$2"
  local archive_binary_name="$3"
  local output_name="$4"
  local executable="$5"
  local archive_name="rclone-v${RCLONE_VERSION}-${platform}.zip"
  local archive_path="$TEMPORARY_DIR/$archive_name"
  local extracted_path="$TEMPORARY_DIR/$output_name"
  local output_path="$BINARIES_DIR/$output_name"

  echo "Downloading $archive_name..."
  curl --fail --location --retry 3 --output "$archive_path" "$DOWNLOAD_ROOT/$archive_name"

  local actual_checksum
  actual_checksum="$(calculate_sha256 "$archive_path")"
  if [ "$actual_checksum" != "$archive_checksum" ]; then
    echo "Checksum verification failed for $archive_name" >&2
    echo "Expected: $archive_checksum" >&2
    echo "Actual:   $actual_checksum" >&2
    exit 1
  fi

  unzip -p "$archive_path" "rclone-v${RCLONE_VERSION}-${platform}/$archive_binary_name" > "$extracted_path"
  if [ "$executable" = "yes" ]; then
    chmod +x "$extracted_path"
  fi
  mv "$extracted_path" "$output_path"
}

require_command curl
require_command unzip
require_command awk
if ! command -v sha256sum >/dev/null 2>&1; then
  require_command shasum
fi

mkdir -p "$BINARIES_DIR"

download_binary \
  "windows-amd64" \
  "4fe815f944b2c47c8a051020e8913728acc9bcf64df8bb85634399d9a1234cdd" \
  "rclone.exe" \
  "rclone-windows-amd64.exe" \
  "no"

download_binary \
  "osx-amd64" \
  "37e50641cd736de296b8aca8149e607b9923b357d79abb902e89c4cdb1fcc790" \
  "rclone" \
  "rclone-osx-amd64" \
  "yes"

download_binary \
  "osx-arm64" \
  "d1cea838b618f9b4f15984748502232684e92ff0b90e3c4c8bd91ac21f4d8695" \
  "rclone" \
  "rclone-osx-arm64" \
  "yes"

download_binary \
  "linux-amd64" \
  "ab9fa5877cee91c64fdfd61a27028a458cf618b39259e5c371dc2ec34a12e415" \
  "rclone" \
  "rclone-linux-amd64" \
  "yes"

echo "Downloaded and verified rclone v${RCLONE_VERSION} binaries in $BINARIES_DIR."
