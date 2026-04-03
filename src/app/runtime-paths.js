import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME } from './constants.js'

function normalizePath(inputPath) {
  return inputPath.replaceAll(path.sep, path.posix.sep)
}

function getProjectRootPath() {
  const currentFilePath = fileURLToPath(import.meta.url)
  return normalizePath(path.resolve(path.dirname(currentFilePath), '../..'))
}

export function getDefaultAppDirectory() {
  const homeDir = normalizePath(os.homedir())

  if (process.platform === 'darwin')
    return path.posix.join(homeDir, `Library/Application Support/${APP_NAME}`)

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ? normalizePath(process.env.APPDATA) : ''
    return appData || path.posix.join(homeDir, `AppData/Roaming/${APP_NAME}`)
  }

  return path.posix.join(homeDir, `.config/${APP_NAME}`)
}

function getBundledRcloneFileName() {
  if (process.platform === 'darwin' && process.arch === 'arm64')
    return 'rclone-osx-arm64'
  if (process.platform === 'darwin' && process.arch === 'x64')
    return 'rclone-osx-amd64'
  if (process.platform === 'linux' && process.arch === 'x64')
    return 'rclone-linux-amd64'

  return ''
}

function resolveResourcesDirectory(bundledRcloneName) {
  const projectResourcesDirectory = path.posix.join(getProjectRootPath(), 'resources')

  if (!bundledRcloneName)
    return projectResourcesDirectory

  const candidateDirectories = [
    process.resourcesPath ? normalizePath(process.resourcesPath) : '',
    projectResourcesDirectory,
  ].filter(Boolean)

  for (const resourcesDirectory of candidateDirectories) {
    const bundledRclonePath = path.posix.join(resourcesDirectory, 'binaries', bundledRcloneName)
    if (fs.existsSync(bundledRclonePath))
      return resourcesDirectory
  }

  return candidateDirectories[0] || projectResourcesDirectory
}

export function getRuntimePaths() {
  const appDirectory = normalizePath(process.env.APP_ROOT_PATH || getDefaultAppDirectory())
  const configPath = normalizePath(process.env.CONFIG_PATH || path.posix.join(appDirectory, 'config.json'))
  const rcloneConfigPath = normalizePath(process.env.RCLONE_CONFIG_PATH || path.posix.join(appDirectory, 'rclone.conf'))
  const logDirectory = normalizePath(path.posix.join(appDirectory, 'logs'))
  const bundledRcloneName = getBundledRcloneFileName()
  const resourcesDirectory = normalizePath(resolveResourcesDirectory(bundledRcloneName))

  return {
    appDirectory,
    configPath,
    rcloneConfigPath,
    logDirectory,
    resourcesDirectory,
    bundledRclonePath: bundledRcloneName
      ? normalizePath(path.posix.join(resourcesDirectory, 'binaries', bundledRcloneName))
      : '',
  }
}
