import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncTaskModalHandlers } from '#src/electron/main/sync-task-modal/window.js'

test('sync task modal listServers handler returns app model servers', async () => {
  const handlers = createSyncTaskModalHandlers({
    runtimePaths: { bundledRclonePath: '/bin/rclone', rcloneConfigPath: '/app/rclone.conf' },
    appModelAccess: {
      async getAppModel() {
        return {
          success: true,
          model: {
            servers: [
              { name: 'synology', type: 'sftp', address: 'nas.local', status: 'unknown' },
            ],
          },
        }
      },
    },
  })

  assert.deepEqual(await handlers.listServers(), {
    success: true,
    servers: [
      { name: 'synology', type: 'sftp', address: 'nas.local', status: 'unknown' },
    ],
  })
})
