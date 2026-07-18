import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { normalizeLocalPath, resolveLocalDirectoryPath, trimTrailingSlash } from '../path-utils.js'
import { getRuntimePaths } from '../runtime-paths.js'
import { loadAppConfig, saveAppConfig } from './app-config.js'

function taskMatchesReference(candidate, task = {}) {
  return candidate.rcloneRemote === task.rcloneRemote
    && candidate.localBasePath === task.localBasePath
}

export async function listSyncTasks() {
  const result = await loadAppConfig()
  return result?.syncTasks
}

function assertTaskInput(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid sync task payload.')

  if (!task.rcloneRemote || typeof task.rcloneRemote !== 'string')
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'A server is required.')

  if (!Object.hasOwn(task, 'remoteBasePath') || typeof task.remoteBasePath !== 'string')
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'A remote folder path is required.')
}

function assertTaskReference(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid sync task reference.')

  if (!task.rcloneRemote || typeof task.rcloneRemote !== 'string' || !task.localBasePath)
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'A sync task reference requires a server and local folder.')
}

function normalizeTaskMapping(task) {
  assertTaskInput(task)
  return {
    rcloneRemote: task.rcloneRemote.trim(),
    localBasePath: resolveLocalDirectoryPath(task.localBasePath),
    remoteBasePath: trimTrailingSlash(normalizeLocalPath(task.remoteBasePath)),
  }
}

function findTaskIndex(tasks, task) {
  return tasks.findIndex(candidate => taskMatchesReference(candidate, task))
}

function assertNoTaskConflict(tasks, candidate, excludedIndex = -1) {
  const conflictingIndex = tasks.findIndex((task, index) => index !== excludedIndex && taskMatchesReference(task, candidate))
  if (conflictingIndex !== -1) {
    throwAppError(APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS, 'A sync task already uses this server and local folder.', {
      meta: {
        rcloneRemote: candidate.rcloneRemote,
        localBasePath: candidate.localBasePath,
      },
    })
  }
}

function requireConfig(config) {
  if (!config) {
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Sync configuration does not exist.')
  }
  return config
}

function normalizeServerName(name) {
  if (typeof name !== 'string' || name.trim().length === 0)
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'A server name is required.')

  return name.trim()
}

export async function createSyncTask(task) {
  const runtimePaths = getRuntimePaths()
  const config = requireConfig(await loadAppConfig(runtimePaths.configPath))
  const mapping = normalizeTaskMapping(task)
  assertNoTaskConflict(config.syncTasks, mapping)

  const nextTask = {
    displayName: '',
    ...mapping,
    ignorePatterns: [],
    lastSyncMode: null,
    lastSyncFolder: null,
    lastSyncDate: null,
  }

  await saveAppConfig({
    globalIgnorePatterns: config.globalIgnorePatterns,
    syncTasks: [...config.syncTasks, nextTask],
  }, runtimePaths)

  return nextTask
}

export async function updateSyncTask(task, expectedTask) {
  const runtimePaths = getRuntimePaths()
  const config = requireConfig(await loadAppConfig(runtimePaths.configPath))
  assertTaskReference(task)
  const taskIndex = findTaskIndex(config.syncTasks, task)
  if (taskIndex === -1) {
    throwAppError(APP_ERROR_CODE.SYNC_TASK_NOT_FOUND, 'Sync task was not found.', {
      meta: task,
    })
  }

  const mapping = normalizeTaskMapping(expectedTask)
  assertNoTaskConflict(config.syncTasks, mapping, taskIndex)

  const nextTask = {
    ...config.syncTasks[taskIndex],
    ...mapping,
  }
  const nextTasks = [...config.syncTasks]
  nextTasks[taskIndex] = nextTask

  await saveAppConfig({
    globalIgnorePatterns: config.globalIgnorePatterns,
    syncTasks: nextTasks,
  }, runtimePaths)

  return nextTask
}

export async function retargetSyncTasks(serverName, expectedServerName) {
  const currentName = normalizeServerName(serverName)
  const nextName = normalizeServerName(expectedServerName)
  const runtimePaths = getRuntimePaths()
  const config = requireConfig(await loadAppConfig(runtimePaths.configPath))

  if (currentName === nextName)
    return config.syncTasks

  const nextTasks = config.syncTasks.map(task => task.rcloneRemote === currentName
    ? { ...task, rcloneRemote: nextName }
    : task)

  if (nextTasks.every((task, index) => task === config.syncTasks[index]))
    return config.syncTasks

  await saveAppConfig({
    globalIgnorePatterns: config.globalIgnorePatterns,
    syncTasks: nextTasks,
  }, runtimePaths)

  return nextTasks
}

export async function deleteTaskFromConfig(task) {
  const runtimePaths = getRuntimePaths()
  assertTaskReference(task)
  const config = await loadAppConfig(runtimePaths.configPath)
  if (!config) {
    return {
      success: false,
      code: 'sync_task.config_missing',
      message: 'Sync config does not exist.',
    }
  }

  const nextTasks = config.syncTasks.filter(candidate => !taskMatchesReference(candidate, task))
  if (nextTasks.length === config.syncTasks.length) {
    return {
      success: false,
      code: 'sync_task.not_found',
      message: 'Sync task was not found.',
    }
  }

  await saveAppConfig({
    globalIgnorePatterns: config.globalIgnorePatterns,
    syncTasks: nextTasks,
  }, runtimePaths)

  return { success: true }
}
