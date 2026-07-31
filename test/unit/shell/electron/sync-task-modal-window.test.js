import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncTaskModalHandlers } from '#electron/main/sync-task-modal/handler.js'
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
