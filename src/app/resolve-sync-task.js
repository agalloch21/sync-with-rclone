import path from 'node:path'
import { normalizeLocalPath, trimTrailingSlash } from './path-utils.js'

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

export function resolveSyncTask(localFolderPath, config, explicitRemoteFolderPath = '') {
  if (!config)
    return null

  const normalizedLocalPath = normalizeLocalPath(path.resolve(localFolderPath))
  const candidates = config.syncJobs
    .filter((syncJob) => {
      const localRoot = trimTrailingSlash(syncJob.localBasePath)
      return normalizedLocalPath === localRoot || normalizedLocalPath.startsWith(`${localRoot}/`)
    })
    .sort((left, right) => right.localBasePath.length - left.localBasePath.length)

  const syncJob = candidates[0]
  if (!syncJob)
    throw new Error(`No syncJob matches local path: ${normalizedLocalPath}`)

  const relativePath = path.posix.relative(syncJob.localBasePath, normalizedLocalPath) || '.'
  const remoteRoot = buildRemoteRoot(syncJob)
  const defaultRemoteFolderPath = joinRemotePath(remoteRoot, relativePath)

  if (explicitRemoteFolderPath && !isWithinRemoteRoot(explicitRemoteFolderPath, remoteRoot)) {
    throw new Error(`Remote path must stay within syncJob '${syncJob.name}': ${explicitRemoteFolderPath}`)
  }

  return {
    syncJob,
    relativePath,
    defaultRemoteFolderPath,
    remoteFolderPath: explicitRemoteFolderPath || defaultRemoteFolderPath,
    extraIgnorePatterns: [
      ...config.globalIgnorePatterns,
      ...syncJob.ignorePatterns,
    ],
  }
}
