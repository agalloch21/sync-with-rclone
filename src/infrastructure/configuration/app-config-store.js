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

function getDefaultAppConfigPath() {
  return getRuntimePaths().configPath
}

function createDefaultAppConfigContent() {
  return `${JSON.stringify({
    globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
    mappings: [],
  }, null, 2)}\n`
}

function normalizeAppConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object')
    throw new Error('Config must be an object')

  if (!Array.isArray(rawConfig.mappings))
    throw new Error('Config must contain mappings')

  return {
    globalIgnorePatterns: Array.isArray(rawConfig.globalIgnorePatterns) ? rawConfig.globalIgnorePatterns : [],
    mappings: rawConfig.mappings.map((mapping, index) => {
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
        ignorePatterns: Array.isArray(mapping.ignorePatterns) ? mapping.ignorePatterns : [],
        lastSyncMode: mapping.lastSyncMode || null,
        lastSyncFolder: mapping.lastSyncFolder || null,
        lastSyncDate: mapping.lastSyncDate || null,
      }
    }),
  }
}

function serializeAppConfig(config) {
  return `${JSON.stringify({
    globalIgnorePatterns: Array.isArray(config?.globalIgnorePatterns) ? config.globalIgnorePatterns : [],
    mappings: Array.isArray(config?.mappings) ? config.mappings : [],
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

    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load config from ${configPath}: ${error.message}`,
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
