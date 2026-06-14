import fs from 'node:fs/promises'
import path from 'node:path'
import { APP_ERROR_CODE, AppError } from './app-errors.js'
import { normalizeLocalPath } from './path-utils.js'
import { getRuntimePaths } from './runtime-paths.js'

function getDefaultConfigPath() {
  return getRuntimePaths().configPath
}

function createDefaultConfigContent() {
  return `${JSON.stringify({
    globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
    syncTasks: [],
  }, null, 2)}\n`
}

function normalizeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object')
    throw new Error('Config must be an object')

  if (!Array.isArray(rawConfig.syncTasks))
    throw new Error('Config must contain syncTasks')

  return {
    globalIgnorePatterns: Array.isArray(rawConfig.globalIgnorePatterns) ? rawConfig.globalIgnorePatterns : [],
    syncTasks: rawConfig.syncTasks.map((task, index) => {
      if (!task?.name)
        throw new Error(`syncTasks[${index}].name is required`)
      if (!task?.rcloneRemote)
        throw new Error(`syncTasks[${index}].rcloneRemote is required`)
      if (!task?.localBasePath)
        throw new Error(`syncTasks[${index}].localBasePath is required`)
      if (!Object.hasOwn(task ?? {}, 'remoteBasePath'))
        throw new Error(`syncTasks[${index}].remoteBasePath is required`)

      return {
        name: task.name,
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

export async function ensureConfig(runtimePaths = getRuntimePaths(), runtime = {}) {
  const fsApi = runtime?.dependents?.fs || fs

  await fsApi.mkdir(runtimePaths.configDirectory, { recursive: true })

  try {
    await fsApi.access(runtimePaths.configPath)
    return { configCreated: false, configPath: runtimePaths.configPath }
  }
  catch (error) {
    if (error?.code !== 'ENOENT')
      throw error
  }

  await fsApi.writeFile(runtimePaths.configPath, createDefaultConfigContent(), 'utf8')
  return { configCreated: true, configPath: runtimePaths.configPath }
}

export async function loadConfig(configPath = getDefaultConfigPath()) {
  try {
    const content = await fs.readFile(configPath, 'utf8')
    const rawConfig = JSON.parse(content)
    const config = normalizeConfig(rawConfig)

    return {
      path: configPath,
      ...config,
    }
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return null

    throw new AppError(
      APP_ERROR_CODE.CONFIG_LOAD_FAILED,
      `Failed to load config from ${configPath}: ${error.message}`,
      { configPath },
      { cause: error },
    )
  }
}

export { getDefaultConfigPath }
