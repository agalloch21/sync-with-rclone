import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
/** @typedef {import('#src/core/snapshot.js').Snapshot} Snapshot */
import { pushEntryToSnapshot } from '#src/core/snapshot.js'
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

function fetchDirectory(remotePath, runtimePaths = {}, cancelSignal = null) {
  cancelSignal?.throwIfAborted()

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

    let settled = false
    let resultString = ''
    let stderrString = ''

    function settle(fn, value) {
      if (settled)
        return

      settled = true
      cancelSignal?.removeEventListener('abort', handleAbort)
      fn(value)
    }

    function handleAbort() {
      child.kill('SIGTERM')
      settle(reject, cancelSignal.reason)
    }

    if (cancelSignal) {
      if (cancelSignal.aborted) {
        settle(reject, cancelSignal.reason)
        return
      }

      cancelSignal.addEventListener('abort', handleAbort, { once: true })
    }

    child.stderr.on('data', (data) => {
      stderrString += data.toString()
    })

    child.stdout.on('data', (chunk) => {
      resultString += chunk.toString()
    })

    child.on('error', (error) => {
      settle(reject, error)
    })

    child.on('close', (code) => {
      if (settled)
        return

      if (code !== 0) {
        const stderrSummary = stderrString.trim()
        settle(reject, new Error(`Failed when executing rclone. Error code: ${code}${stderrSummary ? `. ${stderrSummary}` : ''}`))
        return
      }

      try {
        const allFiles = JSON.parse(resultString)
        settle(resolve, allFiles)
      }
      catch (err) {
        settle(reject, new Error(`Failed to parse JSON:${err.message}`))
      }
    })
  })
}

export async function buildRemoteSnapshot(remotePath, runtimePaths, cancelSignal = null) {
  const entries = await fetchDirectory(remotePath, runtimePaths, cancelSignal)

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
