import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncTaskModalHandlers } from '#src/electron/main/sync-task-modal/handler.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('sync task modal listServers handler returns an OperationResult', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
  }, async () => {
    const handlers = createSyncTaskModalHandlers()

    assert.deepEqual(await handlers.listServersHandler(), {
      success: true,
      value: [
        {
          name: 'synology',
          type: 'sftp',
          address: 'nas.local',
          status: 'unknown',
          config: { type: 'sftp', host: 'nas.local' },
        },
      ],
    })
  })
})

test('sync task modal createServer handler rejects non-object IPC payload shape', async () => {
  const handlers = createSyncTaskModalHandlers()

  const result = await handlers.createServerHandler(null, null)

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'ipc.invalid_payload')
})

test('sync task modal createSyncTask handler persists a mapping as an OperationResult', async () => {
  await withFakeAppRuntime({
    appConfig: { globalIgnorePatterns: [], syncTasks: [] },
  }, async ({ tempDir }) => {
    const handlers = createSyncTaskModalHandlers()
    const result = await handlers.createSyncTaskHandler(null, {
      task: {
        rcloneRemote: 'synology',
        localBasePath: tempDir,
        remoteBasePath: 'Projects',
      },
    })

    assert.equal(result.success, true)
    assert.equal(result.value.remoteBasePath, 'Projects')
  })
})

test('sync task modal updateSyncTask handler returns validation failures as an OperationResult', async () => {
  const handlers = createSyncTaskModalHandlers()
  const result = await handlers.updateSyncTaskHandler(null, {
    task: null,
    expectedTask: null,
  })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'ipc.invalid_payload')
})

test('sync task modal updateSyncTaskIgnorePatterns handler updates only the pattern list', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: ['.DS_Store'],
      syncTasks: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        ignorePatterns: ['old'],
      }],
    },
  }, async () => {
    const handlers = createSyncTaskModalHandlers()
    const result = await handlers.updateSyncTaskIgnorePatternsHandler(null, {
      task: {
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
      },
      ignorePatterns: ['node_modules/', '*.tmp'],
    })

    assert.equal(result.success, true)
    assert.deepEqual(result.value.ignorePatterns, ['node_modules/', '*.tmp'])
    assert.equal(result.value.remoteBasePath, 'Current')
  })
})

test('sync task modal updateSyncTaskIgnorePatterns handler rejects malformed patterns', async () => {
  await withFakeAppRuntime({
    appConfig: {
      syncTasks: [{
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        ignorePatterns: [],
      }],
    },
  }, async () => {
    const handlers = createSyncTaskModalHandlers()
    const result = await handlers.updateSyncTaskIgnorePatternsHandler(null, {
      task: {
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
      },
      ignorePatterns: ['valid', null],
    })

    assert.equal(result.success, false)
    assert.equal(result.error.code, 'ipc.invalid_payload')
  })
})
