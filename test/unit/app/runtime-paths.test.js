import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { getDefaultAppDirectory, getRuntimePaths } from '#src/app/runtime-paths.js'

test('getDefaultAppDirectory defaults to the project root when running unpackaged', () => {
  const defaultAppDirectory = getDefaultAppDirectory()

  assert.equal(defaultAppDirectory.endsWith('/sync-with-rclone'), true)
  assert.equal(defaultAppDirectory.includes('/AppData/Roaming/'), false)
  assert.equal(defaultAppDirectory.includes('/.config/'), false)
})

test('getRuntimePaths derives app config, rclone config and logs from the app directory', () => {
  process.env.APP_ROOT_PATH = '/tmp/sync-with-rclone-app'
  delete process.env.CONFIG_PATH
  delete process.env.RCLONE_CONFIG_PATH

  const runtimePaths = getRuntimePaths()
  assert.equal(runtimePaths.appDirectory, '/tmp/sync-with-rclone-app')
  assert.equal(runtimePaths.configDirectory, '/tmp/sync-with-rclone-app/config')
  assert.equal(runtimePaths.configPath, '/tmp/sync-with-rclone-app/config/config.json')
  assert.equal(runtimePaths.rcloneConfigPath, '/tmp/sync-with-rclone-app/config/rclone.conf')
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
