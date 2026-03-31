import { spawn } from 'node:child_process'
/** @typedef {import('#src/types/snapshot.js').Snapshot} Snapshot */
import { pushEntryToSnapshot } from '#src/types/snapshot.js'

function fetchDirectory(execPath, remotePath) {
  execPath = '/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/resources/binaries/rclone-osx-arm64'
  //   remotePath = 'synology:ProjectsSynced/2025.10.2_xiaobo.fyi/code/xiaobo.fyi'
  const args = [
    'lsjson',
    '-R',
    '--no-mimetype',
    remotePath,
  ]

  return new Promise((resolve, reject) => {
    const child = spawn(execPath, args)
    child.stdout.setEncoding('utf8')

    let resultString = ''

    child.stderr.on('data', (data) => {
      return reject(new Error(`Failed when executing rclone: ${data}`))
    })

    child.stdout.on('data', (chunk) => {
      resultString += chunk.toString()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Failed when executing rclone. Error code: ${code}`))
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

export async function buildRemoteSnapshot(remotePath) {
  try {
    const entries = await fetchDirectory('', remotePath)

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
  catch (err) {
    console.error(err)
  }
}

(async () => {
  try {
    const remoteFolder = 'synology:ProjectsSynced/2025.10.2_xiaobo.fyi/code/xiaobo.fyi'
    const res = await buildRemoteSnapshot(remoteFolder)
    console.log(res)
  }
  catch (error) {
    console.log(error)
  }
})()
