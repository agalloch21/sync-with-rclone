import path from 'node:path'
import { buildSnapshot } from '../modules/scan/build-snapshot.js'
import { resolvePath } from './path-resolver.js'

export async function syncCore(options) {
  // const srcFolder = resolvePath(options.srcFolder)
  const srcFolder = 'D:\\ProjectsSynced\\2025.10.2_xiaobo.fyi\\code\\xiaobo.fyi'
  const destFolder = 'synology:ProjectsSynced\\2025.10.2_xiaobo.fyi\\code\\xiaobo.fyi'

  const srcSnapshot = await buildSnapshot(srcFolder)

  // const destSnapshot =

  applyIgnoreSystem(srcSnapshot, extraPatterns)

  // const { srcFolder, destFolder, configPath } = options;

  // const { ignoreFiles, extraPatterns} = loadConfig(configPath)

  // const srcSnapshot = listAllFiles(srcFolder, extraFiles = ignoreFiles)

  // const destSnapshot = listAllFiles(destFolder)

  // applyIgnoreModule(srcSnapshot, extraPatterns)

  // const result = applyDiffModule(srcSnapshot, destSnapshot)

  // const resultPath = writeToTempFile(result)

  // callRcloneToMoveFile(srcFolder, destFolder, resultPath)
}
