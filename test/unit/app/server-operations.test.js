import assert from 'node:assert/strict'
import test from 'node:test'
import { findTasksUsingRemote } from '#src/app/sync-task/server-operations.js'

test('findTasksUsingRemote returns tasks referencing a remote name', () => {
  const tasks = findTasksUsingRemote({
    syncTasks: [
      { displayName: 'A', rcloneRemote: 'synology' },
      { displayName: 'B', rcloneRemote: 'backup' },
      { displayName: 'C', rcloneRemote: 'synology' },
    ],
  }, 'synology')

  assert.deepEqual(tasks.map(task => task.displayName), ['A', 'C'])
})
