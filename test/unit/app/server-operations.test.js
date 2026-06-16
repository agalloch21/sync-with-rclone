import assert from 'node:assert/strict'
import test from 'node:test'
import { findTasksUsingRemote } from '#src/app/sync-task/server-operations.js'

test('findTasksUsingRemote returns tasks referencing a remote name', () => {
  const tasks = findTasksUsingRemote({
    syncTasks: [
      { name: 'A', rcloneRemote: 'synology' },
      { name: 'B', rcloneRemote: 'backup' },
      { name: 'C', rcloneRemote: 'synology' },
    ],
  }, 'synology')

  assert.deepEqual(tasks.map(task => task.name), ['A', 'C'])
})
