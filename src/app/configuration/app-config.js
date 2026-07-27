import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { normalizeLocalPath } from '../path-utils.js'
import { getRuntimePaths } from '../runtime-paths.js'

const updatingConfigPaths = new Set()

//* ================================ App Config Helpers ==============================*/

function getDefaultAppConfigPath() {
  return getRuntimePaths().configPath
}

function createDefaultAppConfigContent() {
  return `${JSON.stringify({
    globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
    syncTasks: [],
  }, null, 2)}\n`
}

function normalizeAppConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object')
    throw new Error('Config must be an object')

  if (!Array.isArray(rawConfig.syncTasks))
    throw new Error('Config must contain syncTasks')

  return {
    globalIgnorePatterns: Array.isArray(rawConfig.globalIgnorePatterns) ? rawConfig.globalIgnorePatterns : [],
    syncTasks: rawConfig.syncTasks.map((task, index) => {
      if (!task?.rcloneRemote)
        throw new Error(`syncTasks[${index}].rcloneRemote is required`)
      if (!task?.localBasePath)
        throw new Error(`syncTasks[${index}].localBasePath is required`)
      if (!Object.hasOwn(task ?? {}, 'remoteBasePath'))
        throw new Error(`syncTasks[${index}].remoteBasePath is required`)

      return {
        displayName: task.displayName || '',
        rcloneRemote: task.rcloneRemote,
        localBasePath: normalizeLocalPath(path.resolve(task.localBasePath)),
        remoteBasePath: normalizeLocalPath(task.remoteBasePath),
        ignorePatterns: Array.isArray(task.ignorePatterns) ? task.ignorePatterns : [],
        lastSyncMode: task.lastSyncMode || null,
        lastSyncFolder: task.lastSyncFolder || null,
        lastSyncDate: task.lastSyncDate || null,
      }
    }),
  }
}

function serializeAppConfig(config) {
  return `${JSON.stringify({
    globalIgnorePatterns: Array.isArray(config?.globalIgnorePatterns) ? config.globalIgnorePatterns : [],
    syncTasks: Array.isArray(config?.syncTasks) ? config.syncTasks : [],
  }, null, 2)}\n`
}

function requireConfig(config) {
  if (!config)
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Sync configuration does not exist.')

  return config
}

//* ================================ Sync Task Helpers ==============================*/

function taskMatchesReference(candidate, task = {}) {
  return candidate.rcloneRemote === task.rcloneRemote
    && candidate.localBasePath === task.localBasePath
}

function findTaskIndex(tasks, task) {
  return tasks.findIndex(candidate => taskMatchesReference(candidate, task))
}

//* ================================ App Config File Operations ==============================*/

export async function ensureAppConfig(runtimePaths = getRuntimePaths()) {
  await fs.mkdir(runtimePaths.configDirectory, { recursive: true })

  try {
    await fs.access(runtimePaths.configPath)
    return { configCreated: false, configPath: runtimePaths.configPath }
  }
  catch (error) {
    if (error?.code !== 'ENOENT')
      throw error
  }

  await fs.writeFile(runtimePaths.configPath, createDefaultAppConfigContent(), 'utf8')
  return { configCreated: true, configPath: runtimePaths.configPath }
}

export async function loadAppConfig(configPath = getDefaultAppConfigPath()) {
  try {
    const content = await fs.readFile(configPath, 'utf8')
    const rawConfig = JSON.parse(content)
    const config = normalizeAppConfig(rawConfig)

    return {
      path: configPath,
      ...config,
    }
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return null

    throwAppError(
      APP_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load config from ${configPath}: ${error.message}`,
      { cause: error },
    )
  }
}

async function saveAppConfig(config, runtimePaths = getRuntimePaths()) {
  const normalizedConfig = normalizeAppConfig(config)
  const configPath = runtimePaths.configPath
  const temporaryPath = path.join(
    path.dirname(configPath),
    `.${path.basename(configPath)}.${process.pid}.${randomUUID()}.tmp`,
  )

  try {
    await fs.writeFile(temporaryPath, serializeAppConfig(normalizedConfig), 'utf8')
    await fs.rename(temporaryPath, configPath)
  }
  finally {
    await fs.rm(temporaryPath, { force: true })
  }

  return {
    path: configPath,
    ...normalizedConfig,
  }
}

async function updateAppConfig(mutator, runtimePaths = getRuntimePaths()) {
  const configPath = runtimePaths.configPath
  if (updatingConfigPaths.has(configPath)) {
    throwAppError(
      APP_ERROR_CODE.CONFIG_UPDATE_IN_PROGRESS,
      'Another configuration update is already in progress.',
      { meta: { configPath } },
    )
  }

  updatingConfigPaths.add(configPath)

  try {
    const currentConfig = await loadAppConfig(configPath)
    const nextConfig = await mutator(currentConfig)

    if (nextConfig == null)
      return currentConfig

    return await saveAppConfig(nextConfig, runtimePaths)
  }
  finally {
    updatingConfigPaths.delete(configPath)
  }
}

//* ================================ Settings Operations ==============================*/

export async function listGlobalIgnorePatterns() {
  const config = await loadAppConfig()
  return config?.globalIgnorePatterns || []
}

export async function updateGlobalIgnorePatterns(ignorePatterns) {
  const savedConfig = await updateAppConfig((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    return {
      ...config,
      globalIgnorePatterns: [...ignorePatterns],
    }
  })

  return savedConfig.globalIgnorePatterns
}

//* ================================ Sync Task Operations ==============================*/

export async function listSyncTasks() {
  const config = await loadAppConfig()
  return config?.syncTasks
}

export async function createSyncTask(task) {
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

export async function updateSyncTask(task, expectedTask) {
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

export async function updateSyncTaskIgnorePatterns(task, ignorePatterns) {
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

export async function retargetSyncTasks(serverName, expectedServerName) {
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

export async function deleteSyncTask(task) {
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
