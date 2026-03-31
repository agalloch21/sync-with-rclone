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

  console.log(diff)

  // const destSnapshot =

  // applyIgnoreSystem(srcSnapshot, extraPatterns)

  // const { srcFolder, destFolder, configPath } = options;

  // const { ignoreFiles, extraPatterns} = loadConfig(configPath)

  // const srcSnapshot = listAllFiles(srcFolder, extraFiles = ignoreFiles)

  // const destSnapshot = listAllFiles(destFolder)

  // applyIgnoreModule(srcSnapshot, extraPatterns)

  // const result = applyDiffModule(srcSnapshot, destSnapshot)

  // const resultPath = writeToTempFile(result)

  // callRcloneToMoveFile(srcFolder, destFolder, resultPath)
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
    console.log(diff)
  }
  catch (error) {
    console.log(error)
  }
})()
