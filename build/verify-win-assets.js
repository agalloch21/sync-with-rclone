import fs from 'node:fs'
import path from 'node:path'

const requiredFiles = [
  'resources/binaries/rclone-windows-amd64.exe',
  'templates/config.json.win.example',
  'templates/rclone.conf.win.example',
]

const missingFiles = requiredFiles.filter(filePath => !fs.existsSync(path.resolve(filePath)))

if (missingFiles.length > 0) {
  console.error('Missing required Windows packaging assets:')
  for (const filePath of missingFiles)
    console.error(`- ${filePath}`)

  process.exit(1)
}

console.log('Windows packaging assets verified.')
