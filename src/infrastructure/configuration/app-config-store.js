import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { normalizeLocalPath } from '#src/infrastructure/filesystem/local-path.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  throwInfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import { normalizeRemoteBasePath } from '#src/infrastructure/rclone/remote-path.js'
import { withFileMutex } from '#src/infrastructure/runtime/file-mutex.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'

//* ================================ App Config Helpers ==============================*/

const DEFAULT_GLOBAL_FILTER_PATTERNS = ['.DS_Store', 'Thumbs.db', '.git']

function getDefaultAppConfigPath() {
  return getRuntimePaths().configPath
}

function createDefaultAppConfigContent() {
  return `${JSON.stringify({
    globalFilterPatterns: DEFAULT_GLOBAL_FILTER_PATTERNS,
    mappings: [],
  }, null, 2)}\n`
}

function requireAppConfigObject(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig))
    throw new Error('Config must be an object')

  return rawConfig
}

function normalizeGlobalFilterPatterns(rawConfig) {
  const config = requireAppConfigObject(rawConfig)
  if (config.globalFilterPatterns === undefined)
    return [...DEFAULT_GLOBAL_FILTER_PATTERNS]

  if (!Array.isArray(config.globalFilterPatterns) || config.globalFilterPatterns.some(pattern => typeof pattern !== 'string'))
    throw new Error('globalFilterPatterns must be an array of strings')

  return [...config.globalFilterPatterns]
}

function normalizeMappings(rawConfig) {
  const config = requireAppConfigObject(rawConfig)

  if (!Array.isArray(config.mappings))
    throw new Error('Config must contain mappings')

  return config.mappings.map((mapping, index) => {
    if (!mapping?.rcloneRemote)
      throw new Error(`mappings[${index}].rcloneRemote is required`)
    if (!mapping?.localBasePath)
      throw new Error(`mappings[${index}].localBasePath is required`)
    if (!Object.hasOwn(mapping ?? {}, 'remoteBasePath'))
      throw new Error(`mappings[${index}].remoteBasePath is required`)

    return {
      displayName: mapping.displayName || '',
      rcloneRemote: mapping.rcloneRemote,
      localBasePath: normalizeLocalPath(path.resolve(mapping.localBasePath)),
      remoteBasePath: normalizeRemoteBasePath(mapping.remoteBasePath),
      filterPatterns: Array.isArray(mapping.filterPatterns) ? mapping.filterPatterns : [],
      lastSyncMode: mapping.lastSyncMode || null,
      lastSyncFolder: mapping.lastSyncFolder || null,
      lastSyncDate: mapping.lastSyncDate || null,
    }
  })
}

function normalizeAppConfig(rawConfig) {
  return {
    globalFilterPatterns: normalizeGlobalFilterPatterns(rawConfig),
    mappings: normalizeMappings(rawConfig),
  }
}

function serializeAppConfig(config) {
  return `${JSON.stringify({
    globalFilterPatterns: Array.isArray(config?.globalFilterPatterns) ? config.globalFilterPatterns : [],
    mappings: Array.isArray(config?.mappings) ? config.mappings : [],
  }, null, 2)}\n`
}

async function loadRawAppConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf8')
    return JSON.parse(content)
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return null

    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load config from ${configPath}: ${error.message}`,
      { cause: error, meta: { configPath } },
    )
  }
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

  try {
    await fs.writeFile(runtimePaths.configPath, createDefaultAppConfigContent(), {
      encoding: 'utf8',
      flag: 'wx',
    })
    return { configCreated: true, configPath: runtimePaths.configPath }
  }
  catch (error) {
    if (error?.code === 'EEXIST')
      return { configCreated: false, configPath: runtimePaths.configPath }
    throw error
  }
}

export async function loadAppConfig(configPath = getDefaultAppConfigPath()) {
  try {
    const rawConfig = await loadRawAppConfig(configPath)
    if (!rawConfig)
      return null

    const config = normalizeAppConfig(rawConfig)

    return {
      path: configPath,
      ...config,
    }
  }
  catch (error) {
    if (error?.code === INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED)
      throw error

    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load config from ${configPath}: ${error.message}`,
      { cause: error, meta: { configPath } },
    )
  }
}

export async function loadAppMappings(configPath = getDefaultAppConfigPath()) {
  try {
    const rawConfig = await loadRawAppConfig(configPath)
    return rawConfig ? normalizeMappings(rawConfig) : null
  }
  catch (error) {
    if (error?.code === INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED)
      throw error

    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load mappings from ${configPath}: ${error.message}`,
      { cause: error, meta: { configPath } },
    )
  }
}

export async function loadAppGlobalFilterPatterns(configPath = getDefaultAppConfigPath()) {
  try {
    const rawConfig = await loadRawAppConfig(configPath)
    return rawConfig ? normalizeGlobalFilterPatterns(rawConfig) : null
  }
  catch (error) {
    if (error?.code === INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED)
      throw error

    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load global filter patterns from ${configPath}: ${error.message}`,
      { cause: error, meta: { configPath } },
    )
  }
}

async function saveAppConfig(config, runtimePaths = getRuntimePaths()) {
  const configPath = runtimePaths.configPath
  const temporaryPath = path.join(
    path.dirname(configPath),
    `.${path.basename(configPath)}.${process.pid}.${randomUUID()}.tmp`,
  )

  let normalizedConfig
  try {
    normalizedConfig = normalizeAppConfig(config)
    await fs.writeFile(temporaryPath, serializeAppConfig(normalizedConfig), 'utf8')
    await fs.rename(temporaryPath, configPath)
  }
  catch (error) {
    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_UPDATE_FAILED,
      `Failed to update config at ${configPath}: ${error.message}`,
      { cause: error, meta: { configPath } },
    )
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
  const mutexPath = `${configPath}.lock`

  try {
    return await withFileMutex(mutexPath, async () => {
      const currentConfig = await loadAppConfig(configPath)
      const nextConfig = await mutator(currentConfig)

      if (nextConfig == null)
        return currentConfig

      return await saveAppConfig(nextConfig, runtimePaths)
    })
  }
  catch (error) {
    if (error?.code === 'FILE_MUTEX_TIMEOUT') {
      throwInfrastructureError(
        INFRASTRUCTURE_ERROR_CODE.CONFIG_UPDATE_IN_PROGRESS,
        'Another configuration update is still in progress.',
        { cause: error, meta: { configPath } },
      )
    }
    if (error?.code !== 'FILE_MUTEX_FAILED')
      throw error

    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_UPDATE_FAILED,
      `Failed to coordinate config update at ${configPath}: ${error.message}`,
      { cause: error.cause || error, meta: { configPath } },
    )
  }
}
