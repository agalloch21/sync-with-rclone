import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ensureAppConfig, loadAppConfig } from '#src/infrastructure/configuration/app-config-store.js'
import { INFRASTRUCTURE_ERROR_CODE } from '#src/infrastructure/infrastructure-error.js'

test('loadAppConfig reads and normalizes sync config', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    globalIgnorePatterns: ['.DS_Store'],
    mappings: [
      {
        displayName: 'Projects',
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

  const config = await loadAppConfig(configPath)
  assert.equal(config.path, configPath)
  assert.deepEqual(config.globalIgnorePatterns, ['.DS_Store'])
  assert.equal(config.mappings[0].displayName, 'Projects')
  assert.equal(config.mappings[0].rcloneRemote, 'synology')
  assert.deepEqual(config.mappings[0].ignorePatterns, ['node_modules/'])
  assert.equal(config.mappings[0].lastSyncMode, 'push')
  assert.equal(config.mappings[0].lastSyncFolder, 'compare-push')
  assert.equal(config.mappings[0].lastSyncDate, '2026-06-13T00:00:00.000Z')
  assert.ok(path.isAbsolute(config.mappings[0].localBasePath))
})

test('loadAppConfig allows an empty remoteBasePath for syncing to the remote root', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-root-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    mappings: [
      {
        displayName: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: '',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  const config = await loadAppConfig(configPath)
  assert.equal(config.mappings[0].remoteBasePath, '')
})

test('loadAppConfig normalizes remote base paths with remote path rules', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-remote-path-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    mappings: [{
      rcloneRemote: 'synology',
      localBasePath: './test/fixtures/local',
      remoteBasePath: 'Projects\\Current/../Archive/',
    }],
  }))

  const config = await loadAppConfig(configPath)
  assert.equal(config.mappings[0].remoteBasePath, 'Projects/Archive')
})

test('loadAppConfig defaults last sync fields to null', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-last-sync-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    mappings: [
      {
        displayName: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'Projects',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  const config = await loadAppConfig(configPath)
  assert.equal(config.mappings[0].lastSyncMode, null)
  assert.equal(config.mappings[0].lastSyncFolder, null)
  assert.equal(config.mappings[0].lastSyncDate, null)
})

test('loadAppConfig returns null when config file does not exist', async () => {
  const config = await loadAppConfig('/tmp/sync-with-rclone/does-not-exist.json')
  assert.equal(config, null)
})

test('loadAppConfig wraps invalid config errors with a stable error code', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-invalid-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({ mappings: {} }, null, 2))

  await assert.rejects(
    () => loadAppConfig(configPath),
    {
      name: 'InfrastructureError',
      code: INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED,
    },
  )
})

test('loadAppConfig defaults to APP_ROOT_PATH config subdirectory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-app-root-'))
  const configDir = path.join(tempDir, 'config')
  const configPath = path.join(configDir, 'config.json')

  await fs.mkdir(configDir, { recursive: true })
  await fs.writeFile(configPath, JSON.stringify({
    mappings: [],
  }, null, 2))

  process.env.APP_ROOT_PATH = tempDir
  delete process.env.CONFIG_PATH

  const config = await loadAppConfig()
  assert.equal(config.path, configPath.replaceAll(path.sep, path.posix.sep))

  delete process.env.APP_ROOT_PATH
})

test('ensureAppConfig creates a default config when config is missing', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-ensure-config-'))
  const configDirectory = path.join(tempDir, 'config')
  const configPath = path.join(configDirectory, 'config.json')

  const result = await ensureAppConfig({ configDirectory, configPath })

  assert.deepEqual(result, { configCreated: true, configPath })
  assert.deepEqual(JSON.parse(await fs.readFile(configPath, 'utf8')), {
    globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
    mappings: [],
  })
})

test('ensureAppConfig does not overwrite an existing config', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-ensure-config-existing-'))
  const configDirectory = path.join(tempDir, 'config')
  const configPath = path.join(configDirectory, 'config.json')

  await fs.mkdir(configDirectory, { recursive: true })
  await fs.writeFile(configPath, JSON.stringify({ globalIgnorePatterns: ['keep'], mappings: [] }))

  const result = await ensureAppConfig({ configDirectory, configPath })

  assert.deepEqual(result, { configCreated: false, configPath })
  assert.deepEqual(JSON.parse(await fs.readFile(configPath, 'utf8')), {
    globalIgnorePatterns: ['keep'],
    mappings: [],
  })
})

test('ensureAppConfig atomically creates a missing config once', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-ensure-config-race-'))
  const configDirectory = path.join(tempDir, 'config')
  const configPath = path.join(configDirectory, 'config.json')
  const runtimePaths = { configDirectory, configPath }

  const results = await Promise.all([
    ensureAppConfig(runtimePaths),
    ensureAppConfig(runtimePaths),
  ])

  assert.equal(results.filter(result => result.configCreated).length, 1)
  assert.deepEqual(JSON.parse(await fs.readFile(configPath, 'utf8')), {
    globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
    mappings: [],
  })
})
