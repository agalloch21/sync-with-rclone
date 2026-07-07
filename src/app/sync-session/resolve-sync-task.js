import path from 'node:path'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { resolveLocalDirectoryPath, trimTrailingSlash } from '../path-utils.js'

function buildRemoteRoot(syncTask) {
  return `${syncTask.rcloneRemote}:${trimTrailingSlash(syncTask.remoteBasePath)}`
}

function joinRemotePath(remoteRoot, relativePath) {
  if (!relativePath || relativePath === '.')
    return remoteRoot

  return `${remoteRoot}/${relativePath}`
}

function isWithinRemoteRoot(remotePath, remoteRoot) {
  return remotePath === remoteRoot || remotePath.startsWith(`${remoteRoot}/`)
}

function getSyncTaskLabel(syncTask) {
  return syncTask.displayName || syncTask.localBasePath
}

export function resolveSyncTask(config, localFolderPath, explicitRemoteFolderPath = '') {
  if (!config)
    return null

  const normalizedLocalPath = resolveLocalDirectoryPath(localFolderPath)
  const candidates = config.syncTasks
    .filter((syncTask) => {
      const localRoot = trimTrailingSlash(syncTask.localBasePath)
      return normalizedLocalPath === localRoot || normalizedLocalPath.startsWith(`${localRoot}/`)
    })
    .sort((left, right) => right.localBasePath.length - left.localBasePath.length)

  const syncTask = candidates[0]
  if (!syncTask)
    throwAppError(APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK, `No syncTask matches local path: ${normalizedLocalPath}`)

  const relativePath = path.posix.relative(syncTask.localBasePath, normalizedLocalPath) || '.'
  const remoteRoot = buildRemoteRoot(syncTask)
  const defaultRemoteFolderPath = joinRemotePath(remoteRoot, relativePath)

  if (explicitRemoteFolderPath && !isWithinRemoteRoot(explicitRemoteFolderPath, remoteRoot)) {
    throwAppError(
      APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK,
      `Remote path must stay within syncTask '${getSyncTaskLabel(syncTask)}': ${explicitRemoteFolderPath}`,
    )
  }

  return {
    matchedTask: syncTask,
    localFolderPath: normalizedLocalPath,
    relativePath,
    remoteFolderPath: explicitRemoteFolderPath || defaultRemoteFolderPath,
    extraIgnorePatterns: [
      ...config.globalIgnorePatterns,
      ...syncTask.ignorePatterns,
    ],
  }
}
