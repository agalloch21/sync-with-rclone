import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkRemoteDeletion,
  findTasksUsingRemote,
} from '#src/app/sync-task/server-operations.js'

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

test('checkRemoteDeletion blocks deletion when sync tasks still reference a remote', () => {
  assert.deepEqual(checkRemoteDeletion({
    syncTasks: [
      { displayName: 'A', rcloneRemote: 'synology' },
      { displayName: 'B', rcloneRemote: 'backup' },
    ],
  }, 'synology'), {
    success: false,
    code: 'server.in_use',
    message: 'Server is still used by sync tasks.',
    detail: 'This server is used by 1 sync task(s). Delete or move those tasks first.',
  })
})

test('checkRemoteDeletion allows deletion when no tasks reference a remote', () => {
  assert.deepEqual(checkRemoteDeletion({
    syncTasks: [
      { displayName: 'B', rcloneRemote: 'backup' },
    ],
  }, 'synology'), {
    success: true,
  })
})
