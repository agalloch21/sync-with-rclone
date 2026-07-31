import assert from 'node:assert/strict'
import test from 'node:test'
import { createFormModalHandlers } from '#electron/main/form-modal/handler.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('form modal listServers handler returns an OperationResult', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
  }, async () => {
    const handlers = createFormModalHandlers()

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
