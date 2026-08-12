import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { getDefaultAppDirectory, getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'

test('getDefaultAppDirectory defaults to the project root when running unpackaged', () => {
  const defaultAppDirectory = getDefaultAppDirectory()

  assert.equal(defaultAppDirectory.endsWith('/sync-with-rclone'), true)
  assert.equal(defaultAppDirectory.includes('/AppData/Roaming/'), false)
  assert.equal(defaultAppDirectory.includes('/.config/'), false)
})

test('getRuntimePaths derives app config, rclone config and logs from the app directory', () => {
  process.env.APP_ROOT_PATH = '/tmp/sync-with-rclone-app'
  delete process.env.CONFIG_DIRECTORY
  delete process.env.CONFIG_PATH
  delete process.env.RCLONE_CONFIG_PATH

  const runtimePaths = getRuntimePaths()
  assert.equal(runtimePaths.appDirectory, '/tmp/sync-with-rclone-app')
  assert.equal(runtimePaths.configDirectory, '/tmp/sync-with-rclone-app/config')
  assert.equal(runtimePaths.configPath, '/tmp/sync-with-rclone-app/config/config.json')
  assert.equal(runtimePaths.rcloneConfigPath, '/tmp/sync-with-rclone-app/config/rclone.conf')
  assert.equal(runtimePaths.syncAdmissionDirectory, '/tmp/sync-with-rclone-app/runtime/sync-admission')
  assert.equal(runtimePaths.logDirectory, '/tmp/sync-with-rclone-app/logs')

  delete process.env.APP_ROOT_PATH
})

test('getRuntimePaths allows overriding the config directory independently', () => {
  process.env.APP_ROOT_PATH = '/tmp/sync-with-rclone-app'
  process.env.CONFIG_DIRECTORY = '/tmp/sync-with-rclone-config'
  delete process.env.CONFIG_PATH
  delete process.env.RCLONE_CONFIG_PATH

  const runtimePaths = getRuntimePaths()
  assert.equal(runtimePaths.appDirectory, '/tmp/sync-with-rclone-app')
  assert.equal(runtimePaths.configDirectory, '/tmp/sync-with-rclone-config')
  assert.equal(runtimePaths.configPath, '/tmp/sync-with-rclone-config/config.json')
  assert.equal(runtimePaths.rcloneConfigPath, '/tmp/sync-with-rclone-config/rclone.conf')
  assert.equal(runtimePaths.syncAdmissionDirectory, '/tmp/sync-with-rclone-app/runtime/sync-admission')
  assert.equal(runtimePaths.logDirectory, '/tmp/sync-with-rclone-app/logs')

  delete process.env.APP_ROOT_PATH
  delete process.env.CONFIG_DIRECTORY
})

test('getRuntimePaths falls back to project resources when Electron resources do not contain bundled rclone', () => {
  const previousResourcesPath = process.resourcesPath
  process.resourcesPath = '/tmp/fake-electron-resources'

  const runtimePaths = getRuntimePaths()
  assert.equal(runtimePaths.resourcesDirectory.endsWith('/resources'), true)
  assert.equal(runtimePaths.bundledRclonePath.includes('/resources/binaries/'), true)

  process.resourcesPath = previousResourcesPath
})

test('getDefaultAppDirectory uses Application Support for packaged mac builds', { skip: process.platform !== 'darwin' }, () => {
  const resourcesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'swr-mac-runtime-'))
  const appAsarPath = path.join(resourcesDirectory, 'app.asar')
  fs.writeFileSync(appAsarPath, '')

  const previousResourcesPath = process.resourcesPath
  process.resourcesPath = resourcesDirectory

  const defaultAppDirectory = getDefaultAppDirectory()
  assert.equal(defaultAppDirectory, `${process.env.HOME}/Library/Application Support/sync-with-rclone`)

  process.resourcesPath = previousResourcesPath
  fs.rmSync(resourcesDirectory, { recursive: true, force: true })
})

test('getDefaultAppDirectory uses roaming AppData for packaged Windows builds', () => {
  const resourcesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'swr-win-runtime-'))
  const appDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'swr-win-app-data-'))
  fs.writeFileSync(path.join(resourcesDirectory, 'app.asar'), '')

  const runtimePathsModuleUrl = new URL(
    '../../../../src/infrastructure/runtime/runtime-paths.js',
    import.meta.url,
  ).href
  const script = `
    Object.defineProperty(process, 'platform', { value: 'win32' })
    process.resourcesPath = ${JSON.stringify(resourcesDirectory)}
    const { getDefaultAppDirectory } = await import(${JSON.stringify(runtimePathsModuleUrl)})
    process.stdout.write(getDefaultAppDirectory())
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      APPDATA: appDataDirectory,
    },
  })

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, `${appDataDirectory}/sync-with-rclone`)

  fs.rmSync(resourcesDirectory, { recursive: true, force: true })
  fs.rmSync(appDataDirectory, { recursive: true, force: true })
})
