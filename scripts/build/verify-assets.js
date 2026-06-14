import fs from 'node:fs'
import path from 'node:path'

const platform = process.argv[2]

const REQUIRED_FILES = {
  'all': [],
  'win': [
    'resources/binaries/rclone-windows-amd64.exe',
    'scripts/install/windows-installer.ps1',
    'scripts/install/icon.ico',
  ],
  'mac': [
    'resources/binaries/rclone-osx-arm64',
    'scripts/install/macos-menu.sh',
    'scripts/install/icon.png',
  ],
  'mac-x64': [
    'resources/binaries/rclone-osx-amd64',
    'scripts/install/macos-menu.sh',
    'scripts/install/icon.png',
  ],
  'linux': [
    'resources/binaries/rclone-linux-amd64',
  ],
}

const requiredFiles = [...REQUIRED_FILES.all, ...(REQUIRED_FILES[platform] || [])]
const missingFiles = requiredFiles.filter(filePath => !fs.existsSync(path.resolve(filePath)))

if (missingFiles.length > 0) {
  console.error(`Missing required ${platform || 'all'} packaging assets:`)
  for (const filePath of missingFiles)
    console.error(`- ${filePath}`)

  process.exit(1)
}

console.log(`${platform || 'all'} packaging assets verified.`)
