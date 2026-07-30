import { loadAppConfig, updateAppConfig } from '#src/infrastructure/configuration/app-config-store.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'

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

export async function listTasks() {
  const config = await loadAppConfig()
  return config?.syncTasks
}

export async function createTask(task) {
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    if (findTaskIndex(config.syncTasks, task) !== -1) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS, 'A sync task already uses this server and local folder.', {
        meta: {
          rcloneRemote: task.rcloneRemote,
          localBasePath: task.localBasePath,
        },
      })
    }

    return {
      ...config,
      syncTasks: [...config.syncTasks, task],
    }
  })

  return savedConfig.syncTasks.at(-1)
}

export async function updateTask(task, expectedTask) {
  let taskIndex
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    taskIndex = findTaskIndex(config.syncTasks, task)
    if (taskIndex === -1) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_NOT_FOUND, 'Sync task was not found.', {
        meta: task,
      })
    }

    const conflictingIndex = findTaskIndex(config.syncTasks, expectedTask)
    if (conflictingIndex !== -1 && conflictingIndex !== taskIndex) {
      throwAppError(APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS, 'A sync task already uses this server and local folder.', {
        meta: {
          rcloneRemote: expectedTask.rcloneRemote,
          localBasePath: expectedTask.localBasePath,
        },
      })
    }

    const nextTasks = [...config.syncTasks]
    nextTasks[taskIndex] = {
      ...config.syncTasks[taskIndex],
      ...expectedTask,
    }

    return {
      ...config,
      syncTasks: nextTasks,
    }
  })

  return savedConfig.syncTasks[taskIndex]
}

export async function updateTaskIgnorePatterns(task, ignorePatterns) {
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

export async function retargetTasks(serverName, expectedServerName) {
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    const nextTasks = config.syncTasks.map(task => task.rcloneRemote === serverName
      ? { ...task, rcloneRemote: expectedServerName }
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

export async function deleteTask(task) {
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
