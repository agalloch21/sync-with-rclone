import fs from 'node:fs'
import path from 'node:path'

const platform = process.argv[2]

const REQUIRED_FILES = {
  all: [
    'src/electron/renderer/dist/main-panel.html',
    'src/electron/renderer/dist/sync-session.html',
    'src/electron/renderer/dist/task-modal.html',
  ],
}

const requiredFiles = [...REQUIRED_FILES.all, ...(REQUIRED_FILES[platform] || [])]
const missingFiles = requiredFiles.filter(filePath => !fs.existsSync(path.resolve(filePath)))

if (missingFiles.length > 0) {
  console.error('Missing required packaging assets:')
  for (const filePath of missingFiles)
    console.error(`- ${filePath}`)

  process.exit(1)
}

console.log('Packaging assets verified.')
