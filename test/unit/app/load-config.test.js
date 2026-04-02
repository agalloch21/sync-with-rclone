import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { APP_NAME } from '#src/app/constants.js'
import { getDefaultConfigPath, loadConfig } from '#src/app/load-config.js'

test('getDefaultConfigPath uses the application name constant', () => {
  const homeDir = os.homedir().replaceAll(path.sep, path.posix.sep)

  if (process.platform === 'darwin') {
    assert.equal(
      getDefaultConfigPath(),
      path.posix.join(homeDir, `Library/Application Support/${APP_NAME}/config.json`),
    )
    return
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA?.replaceAll(path.sep, path.posix.sep)
    const expectedPath = appData
      ? path.posix.join(appData, `${APP_NAME}/config.json`)
      : path.posix.join(homeDir, `AppData/Roaming/${APP_NAME}/config.json`)
    assert.equal(getDefaultConfigPath(), expectedPath)
    return
  }

  assert.equal(
    getDefaultConfigPath(),
    path.posix.join(homeDir, `.config/${APP_NAME}/config.json`),
  )
})

test('loadConfig reads and normalizes sync config', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-config-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    globalIgnorePatterns: ['.DS_Store'],
    syncJobs: [
      {
        name: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'Projects',
        ignorePatterns: ['node_modules/'],
      },
    ],
  }, null, 2))

  const config = await loadConfig(configPath)
  assert.equal(config.path, configPath)
  assert.deepEqual(config.globalIgnorePatterns, ['.DS_Store'])
  assert.equal(config.syncJobs[0].name, 'Projects')
  assert.equal(config.syncJobs[0].rcloneRemote, 'synology')
  assert.deepEqual(config.syncJobs[0].ignorePatterns, ['node_modules/'])
  assert.ok(path.isAbsolute(config.syncJobs[0].localBasePath))
})

test('loadConfig returns null when config file does not exist', async () => {
  const config = await loadConfig('/tmp/sync-with-rclone/does-not-exist.json')
  assert.equal(config, null)
})
