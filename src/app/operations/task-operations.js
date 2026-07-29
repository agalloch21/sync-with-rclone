import { loadAppConfig, updateAppConfig } from '#src/infrastructure/configuration/app-config-store.js'
import { normalizeLocalPath, resolveLocalDirectoryPath, trimTrailingSlash } from '#src/infrastructure/filesystem/local-path.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import {
  SYNC_TASK_DELETE_PROGRESS_STEP,
  SYNC_TASK_RETARGET_PROGRESS_STEP,
  SYNC_TASK_SAVE_PROGRESS_STEP,
} from './task-operation-contract.js'

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

function assertIgnorePatterns(ignorePatterns) {
  if (!Array.isArray(ignorePatterns) || ignorePatterns.some(pattern => typeof pattern !== 'string'))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Ignore patterns must be an array of strings.')
}

function normalizeServerName(name) {
  if (typeof name !== 'string' || name.trim().length === 0)
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'A server name is required.')

  return name.trim()
}

function requireConfig(config) {
  if (!config)
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Sync configuration does not exist.')

  return config
}

function taskMatchesReference(candidate, task = {}) {
  return candidate.rcloneRemote === task.rcloneRemote
    && candidate.localBasePath === task.localBasePath
}

function findTaskIndex(tasks, task) {
  return tasks.findIndex(candidate => taskMatchesReference(candidate, task))
}

export async function listSyncTasks() {
  const config = await loadAppConfig()
  return config?.syncTasks
}

export async function createSyncTask(task, onProgress) {
  const mapping = normalizeTaskMapping(task)
  const nextTask = {
    displayName: '',
    ...mapping,
    ignorePatterns: [],
    lastSyncMode: null,
    lastSyncFolder: null,
    lastSyncDate: null,
  }

  onProgress?.(SYNC_TASK_SAVE_PROGRESS_STEP.SAVE)
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    if (findTaskIndex(config.syncTasks, nextTask) !== -1) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS, 'A sync task already uses this server and local folder.', {
        meta: {
          rcloneRemote: nextTask.rcloneRemote,
          localBasePath: nextTask.localBasePath,
        },
      })
    }

    return {
      ...config,
      syncTasks: [...config.syncTasks, nextTask],
    }
  })

  return savedConfig.syncTasks.at(-1)
}

export async function updateSyncTask(task, expectedTask, onProgress) {
  assertTaskReference(task)
  const mapping = normalizeTaskMapping(expectedTask)
  onProgress?.(SYNC_TASK_SAVE_PROGRESS_STEP.SAVE)
  let taskIndex
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    taskIndex = findTaskIndex(config.syncTasks, task)
    if (taskIndex === -1) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_NOT_FOUND, 'Sync task was not found.', {
        meta: task,
      })
    }

    const conflictingIndex = findTaskIndex(config.syncTasks, mapping)
    if (conflictingIndex !== -1 && conflictingIndex !== taskIndex) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS, 'A sync task already uses this server and local folder.', {
        meta: {
          rcloneRemote: mapping.rcloneRemote,
          localBasePath: mapping.localBasePath,
        },
      })
    }

    const nextTasks = [...config.syncTasks]
    nextTasks[taskIndex] = {
      ...config.syncTasks[taskIndex],
      ...mapping,
    }

    return {
      ...config,
      syncTasks: nextTasks,
    }
  })

  return savedConfig.syncTasks[taskIndex]
}

export async function updateSyncTaskIgnorePatterns(task, ignorePatterns, onProgress) {
  assertTaskReference(task)
  assertIgnorePatterns(ignorePatterns)
  onProgress?.(SYNC_TASK_SAVE_PROGRESS_STEP.SAVE)
  let taskIndex
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    taskIndex = findTaskIndex(config.syncTasks, task)
    if (taskIndex === -1) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_NOT_FOUND, 'Sync task was not found.', {
        meta: task,
      })
    }

    const nextTasks = [...config.syncTasks]
    nextTasks[taskIndex] = {
      ...config.syncTasks[taskIndex],
      ignorePatterns: [...ignorePatterns],
    }

    return {
      ...config,
      syncTasks: nextTasks,
    }
  })

  return savedConfig.syncTasks[taskIndex]
}

export async function retargetSyncTasks(serverName, expectedServerName, onProgress) {
  const currentName = normalizeServerName(serverName)
  const nextName = normalizeServerName(expectedServerName)

  if (currentName === nextName)
    return await listSyncTasks()

  onProgress?.(SYNC_TASK_RETARGET_PROGRESS_STEP.RETARGET)
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    const nextTasks = config.syncTasks.map(task => task.rcloneRemote === currentName
      ? { ...task, rcloneRemote: nextName }
      : task)

    if (nextTasks.every((task, index) => task === config.syncTasks[index]))
      return null

    return {
      ...config,
      syncTasks: nextTasks,
    }
  })

  return savedConfig.syncTasks
}

export async function deleteTaskFromConfig(task, onProgress) {
  assertTaskReference(task)
  onProgress?.(SYNC_TASK_DELETE_PROGRESS_STEP.DELETE)
  let deletedTask
  await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    const taskIndex = findTaskIndex(config.syncTasks, task)
    if (taskIndex === -1) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_NOT_FOUND, 'Sync task was not found.', {
        meta: task,
      })
    }

    deletedTask = config.syncTasks[taskIndex]
    return {
      ...config,
      syncTasks: config.syncTasks.filter((_candidate, index) => index !== taskIndex),
    }
  })

  return deletedTask
}
