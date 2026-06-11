import path from 'node:path'
import { APP_ERROR_CODE, AppError } from '../app-errors.js'
import { resolveLocalDirectoryPath, trimTrailingSlash } from '../path-utils.js'

function buildRemoteRoot(syncJob) {
  return `${syncJob.rcloneRemote}:${trimTrailingSlash(syncJob.remoteBasePath)}`
}

function joinRemotePath(remoteRoot, relativePath) {
  if (!relativePath || relativePath === '.')
    return remoteRoot

  return `${remoteRoot}/${relativePath}`
}

function isWithinRemoteRoot(remotePath, remoteRoot) {
  return remotePath === remoteRoot || remotePath.startsWith(`${remoteRoot}/`)
}

export function resolveSyncTask(config, localFolderPath, explicitRemoteFolderPath = '') {
  if (!config)
    return null

  const normalizedLocalPath = resolveLocalDirectoryPath(localFolderPath)
  const candidates = config.syncJobs
    .filter((syncJob) => {
      const localRoot = trimTrailingSlash(syncJob.localBasePath)
      return normalizedLocalPath === localRoot || normalizedLocalPath.startsWith(`${localRoot}/`)
    })
    .sort((left, right) => right.localBasePath.length - left.localBasePath.length)

  const syncJob = candidates[0]
  if (!syncJob)
    throw new AppError(APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_JOB, `No syncJob matches local path: ${normalizedLocalPath}`, { path: normalizedLocalPath })

  const relativePath = path.posix.relative(syncJob.localBasePath, normalizedLocalPath) || '.'
  const remoteRoot = buildRemoteRoot(syncJob)
  const defaultRemoteFolderPath = joinRemotePath(remoteRoot, relativePath)

  if (explicitRemoteFolderPath && !isWithinRemoteRoot(explicitRemoteFolderPath, remoteRoot)) {
    throw new AppError(
      APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_JOB,
      `Remote path must stay within syncJob '${syncJob.name}': ${explicitRemoteFolderPath}`,
      { syncJobName: syncJob.name, remotePath: explicitRemoteFolderPath, remoteRoot },
    )
  }

  return {
    matchedJob: syncJob,
    localFolderPath: normalizedLocalPath,
    relativePath,
    remoteFolderPath: explicitRemoteFolderPath || defaultRemoteFolderPath,
    extraIgnorePatterns: [
      ...config.globalIgnorePatterns,
      ...syncJob.ignorePatterns,
    ],
  }
}
