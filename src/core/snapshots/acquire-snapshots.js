import { listLocalFiles } from '#src/infrastructure/filesystem/local-files.js'
import { listRemoteFiles } from '#src/infrastructure/rclone/remote-files.js'
import { buildSnapshot } from './build-snapshot.js'

export async function buildLocalSnapshot(rootPath, extraPatterns = []) {
  const fileEntries = await listLocalFiles(rootPath, extraPatterns)
  return buildSnapshot(rootPath, fileEntries)
}

export async function buildRemoteSnapshot(
  remotePath,
  runtimePaths,
  cancelSignal = null,
) {
  const fileEntries = await listRemoteFiles(
    remotePath,
    runtimePaths,
    cancelSignal,
  )
  return buildSnapshot(remotePath, fileEntries)
}
