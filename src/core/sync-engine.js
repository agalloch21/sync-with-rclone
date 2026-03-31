import path from 'node:path'
import { buildLocalSnapshot } from './build-local-snapshot.js'
import { buildRemoteSnapshot } from './build-remote-snapshot.js'
import { compareSnapshot } from './compare-snapshot.js'
import { resolvePath } from './path-resolver.js'
/**
 * @typedef {object} Options
 * @property {'push', 'pull'} mode
 * @property {string} localFolderPath
 * @property {string} remoteFolderPath
 */
export async function syncCore(options) {
  // const srcFolder = resolvePath(options.srcFolder)
  const localFolder = '/Users/xiaobo/NAS/ProjectsSynced/2025.10.2_xiaobo.fyi/code/xiaobo.fyi'

  const remoteFolder = 'synology:ProjectsSynced/2025.10.2_xiaobo.fyi/code/xiaobo.fyi'

  const localSnapshot = await buildLocalSnapshot(localFolder)

  const remoteSnapshot = await buildRemoteSnapshot(remoteFolder)

  const mode = 'push'
  const srcSnapshot = mode === 'push' ? localSnapshot : remoteSnapshot
  const destSnapshot = mode === 'push' ? remoteSnapshot : localSnapshot

  const diff = compareSnapshot(srcSnapshot, destSnapshot)

  // todo: open a electron window to show the differences visually as a file tree
}

(async () => {
  try {
    const localFolder = '/Users/xiaobo/NAS/ProjectsSynced/2025.10.2_xiaobo.fyi/code/xiaobo.fyi'

    const remoteFolder = 'synology:ProjectsSynced/2025.10.2_xiaobo.fyi/code/xiaobo.fyi'

    const localSnapshot = await buildLocalSnapshot(localFolder)

    const remoteSnapshot = await buildRemoteSnapshot(remoteFolder)

    const mode = 'push'
    const srcSnapshot = mode === 'push' ? localSnapshot : remoteSnapshot
    const destSnapshot = mode === 'push' ? remoteSnapshot : localSnapshot

    const diff = compareSnapshot(srcSnapshot, destSnapshot)

    await showDiffWindow(diff)
    console.log(diff)
  }
  catch (error) {
    console.log(error)
  }
})()
