import path from 'node:path'
import {
  expandHomeDir,
  getLocalPathComparisonKey,
  normalizeLocalPath,
  resolveLocalDirectoryPath as resolveInfrastructureLocalDirectoryPath,
  trimTrailingSlash,
} from '#src/infrastructure/filesystem/local-path.js'
import {
  isRemoteFolderPathWithin,
  normalizeRemoteBasePath,
  normalizeRemoteFolderPath,
} from '#src/infrastructure/rclone/remote-path.js'
import { APP_ERROR_CODE, throwAppError } from '../../app-errors.js'

export function resolveSyncLocalFolderPath(inputPath) {
  try {
    return resolveInfrastructureLocalDirectoryPath(inputPath)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.PATH_INVALID, 'Invalid local directory path.', {
      cause: error,
    })
  }
}

function resolveLogicalLocalPath(localPath) {
  return trimTrailingSlash(normalizeLocalPath(path.resolve(expandHomeDir(localPath))))
}

function getRelativePathIfWithin(candidatePath, rootPath) {
  const candidateKey = getLocalPathComparisonKey(candidatePath)
  const rootKey = getLocalPathComparisonKey(rootPath)
  if (candidateKey === rootKey)
    return '.'

  const rootPrefix = rootKey.endsWith('/') ? rootKey : `${rootKey}/`
  if (!candidateKey.startsWith(rootPrefix))
    return null

  return candidatePath.slice(rootPrefix.length)
}

function buildRemoteRoot(syncTask) {
  return normalizeRemoteFolderPath(`${syncTask.rcloneRemote}:${normalizeRemoteBasePath(syncTask.remoteBasePath)}`)
}

function joinRemotePath(remoteRoot, relativePath) {
  if (!relativePath || relativePath === '.')
    return remoteRoot

  return normalizeRemoteFolderPath(`${remoteRoot}/${relativePath}`)
}

function getSyncTaskLabel(syncTask) {
  return syncTask.displayName || syncTask.localBasePath
}

export function resolveSyncTask(config, localFolderPath, explicitRemoteFolderPath = '') {
  if (!config)
    return null

  const resolvedLocalPath = resolveSyncLocalFolderPath(localFolderPath)
  const requestedLocalPath = resolveLogicalLocalPath(localFolderPath)
  const candidates = config.syncTasks
    .map((syncTask) => {
      const requestedRoot = resolveLogicalLocalPath(syncTask.localBasePath)
      let resolvedRoot = requestedRoot
      try {
        resolvedRoot = resolveSyncLocalFolderPath(requestedRoot)
      }
      catch {}

      const resolvedRelativePath = getRelativePathIfWithin(resolvedLocalPath, resolvedRoot)
      const requestedRelativePath = getRelativePathIfWithin(requestedLocalPath, requestedRoot)
      const relativePath = resolvedRelativePath ?? requestedRelativePath
      const matchedRoot = resolvedRelativePath != null ? resolvedRoot : requestedRoot
      return { syncTask, relativePath, matchedRoot }
    })
    .filter(({ relativePath }) => relativePath != null)
    .sort((left, right) => {
      const leftIsExact = left.relativePath === '.'
      const rightIsExact = right.relativePath === '.'
      if (leftIsExact !== rightIsExact)
        return leftIsExact ? -1 : 1
      return right.matchedRoot.length - left.matchedRoot.length
    })

  const match = candidates[0]
  if (!match)
    throwAppError(APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK, `No syncTask matches local path: ${resolvedLocalPath}`)

  const { syncTask, relativePath } = match
  let remoteRoot
  try {
    remoteRoot = buildRemoteRoot(syncTask)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_INVALID, 'Invalid configured remote folder path.', {
      cause: error,
      meta: {
        rcloneRemote: syncTask.rcloneRemote,
        remoteBasePath: syncTask.remoteBasePath,
      },
    })
  }
  const defaultRemoteFolderPath = joinRemotePath(remoteRoot, relativePath)

  let normalizedExplicitRemotePath = ''
  if (explicitRemoteFolderPath) {
    try {
      normalizedExplicitRemotePath = normalizeRemoteFolderPath(explicitRemoteFolderPath)
    }
    catch (error) {
      throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_INVALID, 'Invalid remote folder path.', {
        cause: error,
        meta: { remoteFolderPath: explicitRemoteFolderPath },
      })
    }
  }

  if (normalizedExplicitRemotePath && !isRemoteFolderPathWithin(normalizedExplicitRemotePath, remoteRoot)) {
    throwAppError(
      APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK,
      `Remote path must stay within syncTask '${getSyncTaskLabel(syncTask)}': ${normalizedExplicitRemotePath}`,
    )
  }

  return {
    matchedTask: syncTask,
    localFolderPath: resolvedLocalPath,
    relativePath,
    remoteFolderPath: normalizedExplicitRemotePath || defaultRemoteFolderPath,
    extraIgnorePatterns: [
      ...config.globalIgnorePatterns,
      ...syncTask.ignorePatterns,
    ],
  }
}
