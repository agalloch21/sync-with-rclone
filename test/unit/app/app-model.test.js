import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { getMainWindowData } from '#src/app/main-window/app-operations.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('getMainWindowData returns servers and sync tasks from the current app operations', async () => {
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
    })
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
