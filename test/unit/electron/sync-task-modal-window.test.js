import assert from 'node:assert/strict'
import test from 'node:test'
import { createLocalFolderDialogOptions, createSyncTaskModalHandlers } from '#src/electron/main/sync-task-modal/handler.js'
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

test('sync task modal createServer handler returns failure OperationResult for invalid payload', async () => {
  const handlers = createSyncTaskModalHandlers()

  const result = await handlers.createServerHandler(null, {
    expectedServerName: '',
    protocolType: 'sftp',
    protocolFields: {},
  })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'server.validation_failed')
})

test('sync task modal createServer handler returns server validation failure for malformed object payload', async () => {
  const handlers = createSyncTaskModalHandlers()

  const result = await handlers.createServerHandler(null, {
    expectedServerName: 'synology',
    protocolType: 'sftp',
  })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'server.validation_failed')
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

test('local folder dialog uses the current path or the supplied home directory', () => {
  assert.deepEqual(createLocalFolderDialogOptions('/current', '/home/user'), {
    defaultPath: '/current',
    properties: ['openDirectory'],
  })
  assert.deepEqual(createLocalFolderDialogOptions('', '/home/user'), {
    defaultPath: '/home/user',
    properties: ['openDirectory'],
  })
})
