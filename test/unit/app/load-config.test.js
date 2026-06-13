import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { getDefaultConfigPath, loadConfig } from '#src/app/load-config.js'
import { getDefaultAppDirectory } from '#src/app/runtime-paths.js'

test('getDefaultConfigPath uses the application name constant', () => {
  const expectedPath = path.posix.join(getDefaultAppDirectory(), 'config', 'config.json')
  assert.equal(getDefaultConfigPath(), expectedPath)
})

test('loadConfig reads and normalizes sync config', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    globalIgnorePatterns: ['.DS_Store'],
    syncTasks: [
      {
        name: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'Projects',
        ignorePatterns: ['node_modules/'],
        lastSyncMode: 'push',
        lastSyncFolder: 'compare-push',
        lastSyncDate: '2026-06-13T00:00:00.000Z',
      },
    ],
  }, null, 2))

  const config = await loadConfig(configPath)
  assert.equal(config.path, configPath)
  assert.deepEqual(config.globalIgnorePatterns, ['.DS_Store'])
  assert.equal(config.syncTasks[0].name, 'Projects')
  assert.equal(config.syncTasks[0].rcloneRemote, 'synology')
  assert.deepEqual(config.syncTasks[0].ignorePatterns, ['node_modules/'])
  assert.equal(config.syncTasks[0].lastSyncMode, 'push')
  assert.equal(config.syncTasks[0].lastSyncFolder, 'compare-push')
  assert.equal(config.syncTasks[0].lastSyncDate, '2026-06-13T00:00:00.000Z')
  assert.ok(path.isAbsolute(config.syncTasks[0].localBasePath))
})

test('loadConfig allows an empty remoteBasePath for syncing to the remote root', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-root-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    syncTasks: [
      {
        name: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: '',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  const config = await loadConfig(configPath)
  assert.equal(config.syncTasks[0].remoteBasePath, '')
})

test('loadConfig defaults last sync fields to null', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-last-sync-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    syncTasks: [
      {
        name: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'Projects',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  const config = await loadConfig(configPath)
  assert.equal(config.syncTasks[0].lastSyncMode, null)
  assert.equal(config.syncTasks[0].lastSyncFolder, null)
  assert.equal(config.syncTasks[0].lastSyncDate, null)
})

test('loadConfig returns null when config file does not exist', async () => {
  const config = await loadConfig('/tmp/sync-with-rclone/does-not-exist.json')
  assert.equal(config, null)
})

test('loadConfig wraps invalid config errors with a stable error code', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-invalid-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({ syncTasks: {} }, null, 2))

  await assert.rejects(
    () => loadConfig(configPath),
    {
      name: 'AppError',
      code: APP_ERROR_CODE.CONFIG_LOAD_FAILED,
    },
  )
})

test('loadConfig defaults to APP_ROOT_PATH config subdirectory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-app-root-'))
  const configDir = path.join(tempDir, 'config')
  const configPath = path.join(configDir, 'config.json')

  await fs.mkdir(configDir, { recursive: true })
  await fs.writeFile(configPath, JSON.stringify({
    syncTasks: [],
  }, null, 2))

  process.env.APP_ROOT_PATH = tempDir
  delete process.env.CONFIG_PATH

  const config = await loadConfig()
  assert.equal(config.path, configPath.replaceAll(path.sep, path.posix.sep))

  delete process.env.APP_ROOT_PATH
})
