import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { deleteMapping, getMainWindowData, listOperationHistory, testServerConnection, updateGlobalIgnorePatterns, updateServer } from '#src/app/app-api.js'
import { SERVER_UPDATE_PROGRESS_STEP } from '#src/app/contracts/server.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('getMainWindowData returns servers and mappings through the app API', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
    appConfig: {
      mappings: [
        {
          displayName: 'Projects',
          rcloneRemote: 'synology',
          localBasePath: '/local/projects',
          remoteBasePath: 'Projects',
          ignorePatterns: [],
        },
      ],
    },
  }, async () => {
    const data = await getMainWindowData()

    assert.deepEqual(data, {
      servers: [
        {
          name: 'synology',
          type: 'sftp',
          address: 'nas.local',
          status: 'unknown',
          config: { type: 'sftp', host: 'nas.local' },
        },
      ],
      mappings: [
        {
          displayName: 'Projects',
          rcloneRemote: 'synology',
          localBasePath: path.resolve('/local/projects'),
          remoteBasePath: 'Projects',
          ignorePatterns: [],
          lastSyncMode: null,
          lastSyncFolder: null,
          lastSyncDate: null,
        },
      ],
      globalIgnorePatterns: [],
    })
  })
})

test('getMainWindowData returns global ignore patterns', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
      mappings: [],
    },
  }, async () => {
    const data = await getMainWindowData()

    assert.deepEqual(data.globalIgnorePatterns, ['.DS_Store', 'Thumbs.db'])
  })
})

test('testServerConnection is a query and does not create operation history', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
  }, async () => {
    await testServerConnection('synology')

    assert.deepEqual(await listOperationHistory(), [])
  })
})

test('updateGlobalIgnorePatterns persists through the app API', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      globalIgnorePatterns: ['old'],
      mappings: [],
    },
  }, async ({ configPath }) => {
    assert.deepEqual(await updateGlobalIgnorePatterns(['.DS_Store']), ['.DS_Store'])

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
  })
})

test('getMainWindowData adds a missing server placeholder for mapping references without a server', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      mappings: [
        {
          displayName: 'Missing',
          rcloneRemote: 'missing-server',
          localBasePath: '/local/missing',
          remoteBasePath: 'Missing',
          ignorePatterns: [],
        },
      ],
    },
  }, async () => {
    const data = await getMainWindowData()

    assert.deepEqual(data.servers, [
      {
        name: 'missing-server',
        type: null,
        address: '',
        status: 'missing',
        config: null,
      },
    ])
  })
})

test('updateServer changes protocol configuration without changing mapping references', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
    appConfig: {
      globalIgnorePatterns: ['.DS_Store'],
      mappings: [
        {
          displayName: 'Projects',
          rcloneRemote: 'synology',
          localBasePath: '/local/projects',
          remoteBasePath: 'Projects',
          ignorePatterns: [],
        },
        {
          displayName: 'Other',
          rcloneRemote: 'backup',
          localBasePath: '/local/other',
          remoteBasePath: 'Other',
          ignorePatterns: [],
        },
      ],
    },
  }, async ({ configPath, readRcloneState }) => {
    const progress = []
    await updateServer('synology', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }, step => progress.push(step))

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.mappings.map(mapping => mapping.rcloneRemote), ['synology', 'backup'])
    assert.deepEqual(await readRcloneState(), {
      synology: {
        type: 'sftp',
        host: 'nas.local',
        port: '22',
        user: 'xiaobo',
        pass: 'secret',
      },
    })
    assert.deepEqual(progress, [SERVER_UPDATE_PROGRESS_STEP.SAVE])

    const history = await listOperationHistory()
    assert.deepEqual(history.map(record => record.status), ['succeeded', 'started'])
    assert.equal(history[0].operation, 'updateServer')
    assert.equal(JSON.stringify(history).includes('secret'), false)
  })
})

test('deleteMapping throws when the requested mapping was not deleted', async () => {
  await withFakeAppRuntime({
    appConfig: {
      mappings: [],
    },
  }, async () => {
    await assert.rejects(
      () => deleteMapping({
        rcloneRemote: 'synology',
        localBasePath: '/local/missing',
      }),
      error => error?.code === 'mapping.not_found',
    )
  })
})
