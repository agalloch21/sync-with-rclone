import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { APP_NAME } from './constants.js'

function normalizeLocalPath(inputPath) {
  return inputPath.replaceAll(path.sep, path.posix.sep)
}

function getDefaultConfigPath() {
  const homeDir = os.homedir().replaceAll(path.sep, path.posix.sep)

  if (process.platform === 'darwin')
    return path.posix.join(homeDir, `Library/Application Support/${APP_NAME}/config.json`)

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA?.replaceAll(path.sep, path.posix.sep)
    return appData
      ? path.posix.join(appData, `${APP_NAME}/config.json`)
      : path.posix.join(homeDir, `AppData/Roaming/${APP_NAME}/config.json`)
  }

  return path.posix.join(homeDir, `.config/${APP_NAME}/config.json`)
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
      if (!job?.remoteBasePath)
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

export async function loadConfig(configPath = process.env.CONFIG_PATH || getDefaultConfigPath()) {
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

    throw new Error(`Failed to load config from ${configPath}: ${error.message}`)
  }
}

export { getDefaultConfigPath }
