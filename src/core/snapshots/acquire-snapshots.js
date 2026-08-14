import { listLocalFiles } from '#src/infrastructure/filesystem/local-files.js'
import { listRemoteFiles } from '#src/infrastructure/rclone/remote-files.js'
import { buildSnapshot } from './build-snapshot.js'

export async function buildLocalSnapshot(rootPath, exclusions, cancelSignal = null) {
  const fileEntries = await listLocalFiles(rootPath, exclusions, cancelSignal)
  return buildSnapshot(rootPath, fileEntries)
}

export async function buildRemoteSnapshot(
  remotePath,
  exclusions,
  runtimePaths,
  cancelSignal = null,
) {
  const fileEntries = await listRemoteFiles(
    remotePath,
    exclusions,
    runtimePaths,
    cancelSignal,
  )
  return buildSnapshot(remotePath, fileEntries)
}
