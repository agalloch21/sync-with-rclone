import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { normalizeLocalPath } from '#src/infrastructure/filesystem/local-path.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'

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

export async function updateAppConfig(mutator, runtimePaths = getRuntimePaths()) {
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
