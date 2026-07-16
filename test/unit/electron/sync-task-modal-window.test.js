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
