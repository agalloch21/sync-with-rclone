import fs from 'node:fs'
import path from 'node:path'

const platform = process.argv[2]

const REQUIRED_FILES = {
  'all': [],
  'win': [
    'resources/templates/config.json.win.example',
    'resources/templates/rclone.conf.win.example',
    'resources/binaries/rclone-windows-amd64.exe',
    'scripts/install/windows-installer.ps1',
    'scripts/install/icon.ico',
  ],
  'mac': [
    'resources/templates/config.json.mac.example',
    'resources/templates/rclone.conf.mac.example',
    'resources/binaries/rclone-osx-arm64',
    'scripts/install/macos-menu.sh',
    'scripts/install/icon.png',
  ],
  'mac-x64': [
    'resources/templates/config.json.mac.example',
    'resources/templates/rclone.conf.mac.example',
    'resources/binaries/rclone-osx-amd64',
    'scripts/install/macos-menu.sh',
    'scripts/install/icon.png',
  ],
  'linux': [
    'resources/binaries/rclone-linux-amd64',
  ],
}

const requiredFiles = [...REQUIRED_FILES.all, ...(REQUIRED_FILES[platform] || [])]
const missingFiles = requiredFiles.all.filter(filePath => !fs.existsSync(path.resolve(filePath)))

if (missingFiles.length > 0) {
  console.error('Missing required Windows packaging assets:')
  for (const filePath of missingFiles)
    console.error(`- ${filePath}`)

  process.exit(1)
}

console.log('Windows packaging assets verified.')
