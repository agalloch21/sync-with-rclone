import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
/** @typedef {import('#src/types/snapshot.js').Snapshot} Snapshot */
import { pushEntryToSnapshot } from '#src/types/snapshot.js'
import { buildRcloneArgs, getRcloneExecutable } from './rclone-runtime.js'

function getDefaultBundledRclonePath() {
  const currentFilePath = fileURLToPath(import.meta.url)
  const projectRoot = path.posix.resolve(path.posix.dirname(currentFilePath).replaceAll(path.sep, path.posix.sep), '../..')

  if (process.platform === 'darwin' && process.arch === 'arm64')
    return path.posix.join(projectRoot, 'resources/binaries/rclone-osx-arm64')
  if (process.platform === 'darwin' && process.arch === 'x64')
    return path.posix.join(projectRoot, 'resources/binaries/rclone-osx-amd64')
  if (process.platform === 'linux' && process.arch === 'x64')
    return path.posix.join(projectRoot, 'resources/binaries/rclone-linux-amd64')

  return 'rclone'
}

function fetchDirectory(remotePath, runtimePaths = {}) {
  const execPath = getRcloneExecutable({
    ...runtimePaths,
    bundledRclonePath: runtimePaths.bundledRclonePath || getDefaultBundledRclonePath(),
  })
  const args = buildRcloneArgs(runtimePaths, [
    'lsjson',
    '-R',
    '--no-mimetype',
    remotePath,
  ])

  return new Promise((resolve, reject) => {
    const child = spawn(execPath, args)
    child.stdout.setEncoding('utf8')

    let resultString = ''
    let stderrString = ''

    child.stderr.on('data', (data) => {
      stderrString += data.toString()
    })

    child.stdout.on('data', (chunk) => {
      resultString += chunk.toString()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        const stderrSummary = stderrString.trim()
        return reject(new Error(`Failed when executing rclone. Error code: ${code}${stderrSummary ? `. ${stderrSummary}` : ''}`))
      }

      try {
        const allFiles = JSON.parse(resultString)
        resolve(allFiles)
      }
      catch (err) {
        reject(new Error(`Failed to parse JSON:${err.message}`))
      }
    })
  })
}

export async function buildRemoteSnapshot(remotePath, options = {}) {
  const entries = await fetchDirectory(remotePath, options.runtimePaths)

  const snapshot = {
    root: remotePath,
    fileEntries: new Map(),
    dirEntries: new Map([
      ['.', { parent: null, children: new Map() }],
    ]),
  }

  for (const entry of entries) {
    // entry sample:
    // {"Path":"app/app.vue","Name":"app.vue","Size":76,"ModTime":"2026-03-18T18:22:17Z","IsDir":false},
    pushEntryToSnapshot(snapshot, entry.Path, entry.IsDir, entry.Size, Date.parse(entry.ModTime))
  }

  return snapshot
}
