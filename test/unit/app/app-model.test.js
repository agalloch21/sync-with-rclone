import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { deleteSyncTask, getMainWindowData, listOperationHistory, testServerConnection, updateGlobalIgnorePatterns, updateServer } from '#src/app/app-api.js'
import { SERVER_UPDATE_PROGRESS_STEP } from '#src/app/contracts/server.js'
import { SYNC_TASK_RETARGET_PROGRESS_STEP } from '#src/app/contracts/task.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('getMainWindowData returns servers and sync tasks through the app API', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
    appConfig: {
      syncTasks: [
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
      syncTasks: [
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
      syncTasks: [],
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
      syncTasks: [],
    },
  }, async ({ configPath }) => {
    assert.deepEqual(await updateGlobalIgnorePatterns(['.DS_Store']), ['.DS_Store'])

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
  })
})

test('getMainWindowData adds a missing server placeholder for task references without a server', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {},
    appConfig: {
      syncTasks: [
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

test('updateServer retargets all sync tasks when the server is renamed', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
    appConfig: {
      globalIgnorePatterns: ['.DS_Store'],
      syncTasks: [
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
  }, async ({ configPath }) => {
    const progress = []
    await updateServer('synology', 'nas', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }, step => progress.push(step))

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.syncTasks.map(task => task.rcloneRemote), ['nas', 'backup'])
    assert.deepEqual(progress, [
      SERVER_UPDATE_PROGRESS_STEP.SAVE,
      SYNC_TASK_RETARGET_PROGRESS_STEP.RETARGET,
    ])

    const history = await listOperationHistory()
    assert.deepEqual(history.map(record => record.status), ['succeeded', 'started'])
    assert.equal(history[0].operation, 'updateServer')
    assert.equal(JSON.stringify(history).includes('secret'), false)
  })
})

test('updateServer reports only the save step when the server name is unchanged', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'old.local' },
    },
    appConfig: {
      syncTasks: [],
    },
  }, async () => {
    const progress = []
    await updateServer('synology', 'synology', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }, step => progress.push(step))

    assert.deepEqual(progress, [SERVER_UPDATE_PROGRESS_STEP.SAVE])
  })
})

test('updateServer restores the original remote when task retargeting fails', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'old', pass: 'old-obscured' },
    },
    appConfig: {
      syncTasks: [],
    },
  }, async ({ configPath, readRcloneState }) => {
    await fs.writeFile(configPath, '{ invalid config', 'utf8')
    const progress = []

    await assert.rejects(
      () => updateServer('synology', 'nas', 'sftp', {
        host: 'new.local',
        port: 2222,
        user: 'new',
        pass: 'new-secret',
      }, step => progress.push(step)),
      error => error?.code === 'config.update_failed',
    )

    assert.deepEqual(await readRcloneState(), {
      synology: {
        type: 'sftp',
        host: 'old.local',
        port: '22',
        user: 'old',
        pass: 'old-obscured',
      },
    })
    assert.deepEqual(progress, [
      SERVER_UPDATE_PROGRESS_STEP.SAVE,
      SYNC_TASK_RETARGET_PROGRESS_STEP.RETARGET,
      SERVER_UPDATE_PROGRESS_STEP.ROLLBACK,
    ])
  })
})

test('updateServer leaves tasks and source unchanged when replacement fails', async () => {
  await withFakeAppRuntime({
    failDeleteNames: ['synology'],
    rcloneConfig: {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'old', pass: 'old-obscured' },
    },
    appConfig: {
      syncTasks: [{
        displayName: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: '/local/projects',
        remoteBasePath: 'Projects',
        ignorePatterns: [],
      }],
    },
  }, async ({ configPath, readRcloneState }) => {
    const progress = []

    await assert.rejects(
      () => updateServer('synology', 'nas', 'sftp', {
        host: 'new.local',
        port: 2222,
        user: 'new',
        pass: 'new-secret',
      }, step => progress.push(step)),
      error => error?.code === 'server.operation_failed',
    )

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.syncTasks.map(task => task.rcloneRemote), ['synology'])
    assert.deepEqual(await readRcloneState(), {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'old', pass: 'old-obscured' },
    })
    assert.deepEqual(progress, [
      SERVER_UPDATE_PROGRESS_STEP.SAVE,
    ])
  })
})

test('deleteSyncTask throws when the requested task was not deleted', async () => {
  await withFakeAppRuntime({
    appConfig: {
      syncTasks: [],
    },
  }, async () => {
    await assert.rejects(
      () => deleteSyncTask({
        rcloneRemote: 'synology',
        localBasePath: '/local/missing',
      }),
      error => error?.code === 'sync_task.not_found',
    )
  })
})
