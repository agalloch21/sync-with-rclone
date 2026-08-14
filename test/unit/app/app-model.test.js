import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { deleteMapping, getMainWindowData, listGlobalFilterPatterns, listOperationHistory, testServerConnection, updateGlobalFilterPatterns, updateServer } from '#src/app/app-api.js'
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
          filterPatterns: [],
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
          filterPatterns: [],
          lastSyncMode: null,
          lastSyncFolder: null,
          lastSyncDate: null,
        },
      ],
    })
  })
})

test('listGlobalFilterPatterns loads independently from mappings', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      globalFilterPatterns: ['.DS_Store', 'Thumbs.db'],
      mappings: [],
    },
  }, async ({ configPath }) => {
    await fs.writeFile(configPath, JSON.stringify({
      globalFilterPatterns: ['.DS_Store', 'Thumbs.db'],
      syncTasks: [],
    }))

    assert.deepEqual(await listGlobalFilterPatterns(), ['.DS_Store', 'Thumbs.db'])
  })
})

test('getMainWindowData loads mappings independently from global filter patterns', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      globalFilterPatterns: [],
      mappings: [],
    },
  }, async ({ configPath }) => {
    await fs.writeFile(configPath, JSON.stringify({
      globalFilterPatterns: {},
      mappings: [],
    }))

    assert.deepEqual(await getMainWindowData(), {
      servers: [],
      mappings: [],
    })
  })
})

test('getMainWindowData preserves configuration load errors', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
    appConfig: {
      mappings: [],
    },
  }, async ({ configPath }) => {
    await fs.writeFile(configPath, '{invalid json', 'utf8')

    await assert.rejects(
      () => getMainWindowData(),
      error => error?.code === 'config.load_failed',
    )
  })
})

test('getMainWindowData reports a missing configuration', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      mappings: [],
    },
  }, async ({ configPath }) => {
    await fs.unlink(configPath)

    await assert.rejects(
      () => getMainWindowData(),
      error => error?.code === 'config.load_failed',
    )
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

test('updateGlobalFilterPatterns persists through the app API', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      globalFilterPatterns: ['old'],
      mappings: [],
    },
  }, async ({ configPath }) => {
    assert.deepEqual(await updateGlobalFilterPatterns(['.DS_Store']), ['.DS_Store'])

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalFilterPatterns, ['.DS_Store'])
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
          filterPatterns: [],
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
      globalFilterPatterns: ['.DS_Store'],
      mappings: [
        {
          displayName: 'Projects',
          rcloneRemote: 'synology',
          localBasePath: '/local/projects',
          remoteBasePath: 'Projects',
          filterPatterns: [],
        },
        {
          displayName: 'Other',
          rcloneRemote: 'backup',
          localBasePath: '/local/other',
          remoteBasePath: 'Other',
          filterPatterns: [],
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
