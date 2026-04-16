import fs from 'node:fs'
import path from 'node:path'

const platform = process.argv[2]

const REQUIRED_FILES = {
  all: ['src/electron/renderer/dist/sync-session.html'],
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
