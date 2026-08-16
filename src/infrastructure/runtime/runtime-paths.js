import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function normalizePath(inputPath) {
  return inputPath.replaceAll(path.sep, path.posix.sep)
}

function getProjectRootPath() {
  const currentFilePath = fileURLToPath(import.meta.url)
  return normalizePath(path.resolve(path.dirname(currentFilePath), '../../..'))
}

function getBundledInstallDirectory() {
  if (!process.resourcesPath)
    return ''

  const resourcesDirectory = normalizePath(process.resourcesPath)
  const appAsarPath = path.posix.join(resourcesDirectory, 'app.asar')
  if (!fs.existsSync(appAsarPath))
    return ''

  return normalizePath(path.posix.dirname(resourcesDirectory))
}

function getBundledMacAppSupportDirectory() {
  if (process.platform !== 'darwin')
    return ''

  const bundledInstallDirectory = getBundledInstallDirectory()
  if (!bundledInstallDirectory)
    return ''

  return normalizePath(path.join(os.homedir(), 'Library', 'Application Support', 'sync-with-rclone'))
}

function getBundledWindowsAppDataDirectory() {
  if (process.platform !== 'win32')
    return ''

  const bundledInstallDirectory = getBundledInstallDirectory()
  if (!bundledInstallDirectory)
    return ''

  const roamingAppDataDirectory = process.env.APPDATA
    || path.join(os.homedir(), 'AppData', 'Roaming')
  return normalizePath(path.join(roamingAppDataDirectory, 'sync-with-rclone'))
}

export function getDefaultAppDirectory() {
  const bundledMacAppSupportDirectory = getBundledMacAppSupportDirectory()
  if (bundledMacAppSupportDirectory)
    return bundledMacAppSupportDirectory

  const bundledWindowsAppDataDirectory = getBundledWindowsAppDataDirectory()
  if (bundledWindowsAppDataDirectory)
    return bundledWindowsAppDataDirectory

  const bundledInstallDirectory = getBundledInstallDirectory()
  if (bundledInstallDirectory)
    return bundledInstallDirectory

  return getProjectRootPath()
}

function getBundledRcloneFileName() {
  if (process.platform === 'darwin' && process.arch === 'arm64')
    return 'rclone-osx-arm64'
  if (process.platform === 'darwin' && process.arch === 'x64')
    return 'rclone-osx-amd64'
  if (process.platform === 'win32' && process.arch === 'x64')
    return 'rclone-windows-amd64.exe'
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
  const configDirectory = normalizePath(process.env.CONFIG_DIRECTORY || path.posix.join(appDirectory, 'config'))
  const configPath = normalizePath(process.env.CONFIG_PATH || path.posix.join(configDirectory, 'config.json'))
  const rcloneConfigPath = normalizePath(process.env.RCLONE_CONFIG_PATH || path.posix.join(configDirectory, 'rclone.conf'))
  const syncAdmissionDirectory = normalizePath(path.posix.join(appDirectory, 'runtime', 'sync-admission'))
  const logDirectory = normalizePath(path.posix.join(appDirectory, 'logs'))
  const bundledRcloneName = getBundledRcloneFileName()
  const resourcesDirectory = normalizePath(resolveResourcesDirectory(bundledRcloneName))

  return {
    appDirectory,
    configDirectory,
    configPath,
    rcloneConfigPath,
    syncAdmissionDirectory,
    logDirectory,
    resourcesDirectory,
    bundledRclonePath: bundledRcloneName
      ? normalizePath(path.posix.join(resourcesDirectory, 'binaries', bundledRcloneName))
      : '',
  }
}
