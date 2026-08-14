import { listLocalFiles } from '#src/infrastructure/filesystem/local-files.js'
import { listRemoteFiles } from '#src/infrastructure/rclone/remote-files.js'
import { createSyncFilter } from '../filters/sync-filter.js'
import { buildSnapshot } from './build-snapshot.js'

export async function buildLocalSnapshot(rootPath, filterPatterns = [], cancelSignal = null) {
  const syncFilter = createSyncFilter(filterPatterns)
  const fileEntries = await listLocalFiles(rootPath, syncFilter, cancelSignal)
  return buildSnapshot(rootPath, fileEntries)
}

export async function buildRemoteSnapshot(
  remotePath,
  filterPatterns = [],
  runtimePaths,
  cancelSignal = null,
) {
  const syncFilter = createSyncFilter(filterPatterns)
  const fileEntries = await listRemoteFiles(
    remotePath,
    syncFilter,
    runtimePaths,
    cancelSignal,
  )
  return buildSnapshot(remotePath, fileEntries)
}
