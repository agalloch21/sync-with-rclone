import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { APP_NAME } from '#src/app/constants.js'
import { getDefaultAppDirectory, getRuntimePaths } from '#src/app/runtime-paths.js'

test('getDefaultAppDirectory uses the application name constant', () => {
  const homeDir = os.homedir().replaceAll(path.sep, path.posix.sep)

  if (process.platform === 'darwin') {
    assert.equal(getDefaultAppDirectory(), path.posix.join(homeDir, `Library/Application Support/${APP_NAME}`))
    return
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA?.replaceAll(path.sep, path.posix.sep) || ''
    assert.equal(
      getDefaultAppDirectory(),
      appData || path.posix.join(homeDir, `AppData/Roaming/${APP_NAME}`),
    )
    return
  }

  assert.equal(getDefaultAppDirectory(), path.posix.join(homeDir, `.config/${APP_NAME}`))
})

test('getRuntimePaths derives app config, rclone config and logs from the app directory', () => {
  process.env.APP_ROOT_PATH = '/tmp/sync-with-rclone-app'
  delete process.env.CONFIG_PATH
  delete process.env.RCLONE_CONFIG_PATH

  const runtimePaths = getRuntimePaths()
  assert.equal(runtimePaths.appDirectory, '/tmp/sync-with-rclone-app')
  assert.equal(runtimePaths.configPath, '/tmp/sync-with-rclone-app/config.json')
  assert.equal(runtimePaths.rcloneConfigPath, '/tmp/sync-with-rclone-app/rclone.conf')
  assert.equal(runtimePaths.logDirectory, '/tmp/sync-with-rclone-app/logs')

  delete process.env.APP_ROOT_PATH
})

test('getRuntimePaths falls back to project resources when Electron resources do not contain bundled rclone', () => {
  const previousResourcesPath = process.resourcesPath
  process.resourcesPath = '/tmp/fake-electron-resources'

  const runtimePaths = getRuntimePaths()
  assert.equal(runtimePaths.resourcesDirectory.endsWith('/resources'), true)
  assert.equal(runtimePaths.bundledRclonePath.includes('/resources/binaries/'), true)

  process.resourcesPath = previousResourcesPath
})
