import fs from 'node:fs/promises'
import path from 'node:path'
import { APP_ERROR_CODE, AppError } from './app-errors.js'
import { normalizeLocalPath } from './path-utils.js'
import { getRuntimePaths } from './runtime-paths.js'

function getDefaultConfigPath() {
  return getRuntimePaths().configPath
}

function normalizeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object')
    throw new Error('Config must be an object')

  if (!Array.isArray(rawConfig.syncJobs))
    throw new Error('Config must contain syncJobs')

  return {
    globalIgnorePatterns: Array.isArray(rawConfig.globalIgnorePatterns) ? rawConfig.globalIgnorePatterns : [],
    syncJobs: rawConfig.syncJobs.map((job, index) => {
      if (!job?.name)
        throw new Error(`syncJobs[${index}].name is required`)
      if (!job?.rcloneRemote)
        throw new Error(`syncJobs[${index}].rcloneRemote is required`)
      if (!job?.localBasePath)
        throw new Error(`syncJobs[${index}].localBasePath is required`)
      if (!Object.hasOwn(job ?? {}, 'remoteBasePath'))
        throw new Error(`syncJobs[${index}].remoteBasePath is required`)

      return {
        name: job.name,
        rcloneRemote: job.rcloneRemote,
        localBasePath: normalizeLocalPath(path.resolve(job.localBasePath)),
        remoteBasePath: normalizeLocalPath(job.remoteBasePath),
        ignorePatterns: Array.isArray(job.ignorePatterns) ? job.ignorePatterns : [],
      }
    }),
  }
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
