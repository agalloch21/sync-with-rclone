import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const currentDirPath = dirname(fileURLToPath(import.meta.url))
const electronBinary = require('electron')

const electronMainEntry = join(currentDirPath, 'index.cjs')
const childEnv = { ...process.env }

delete childEnv.ELECTRON_RUN_AS_NODE

const child = spawn(electronBinary, [electronMainEntry, ...process.argv.slice(2)], {
  env: childEnv,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
