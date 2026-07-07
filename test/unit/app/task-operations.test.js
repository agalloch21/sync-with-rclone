import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { deleteTaskFromConfig } from '#src/app/configuration/task-operations.js'

test('deleteTaskFromConfig removes the selected task and preserves global ignore patterns', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-task-config-'))
  const configPath = path.join(tempDir, 'config.json')
  const localA = path.join(tempDir, 'a')
  const localB = path.join(tempDir, 'b')

  await fs.writeFile(configPath, JSON.stringify({
    globalIgnorePatterns: ['.DS_Store'],
    syncTasks: [
      {
        displayName: 'A',
        rcloneRemote: 'synology',
        localBasePath: localA,
        remoteBasePath: 'A',
        ignorePatterns: [],
      },
      {
        displayName: 'B',
        rcloneRemote: 'synology',
        localBasePath: localB,
        remoteBasePath: 'B',
        ignorePatterns: ['node_modules/'],
      },
    ],
  }, null, 2))

  assert.deepEqual(await deleteTaskFromConfig({
    rcloneRemote: 'synology',
    localBasePath: localA,
  }, { configPath }), { success: true })

  const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
  assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
  assert.deepEqual(saved.syncTasks.map(task => task.displayName), ['B'])
  assert.deepEqual(saved.syncTasks[0].ignorePatterns, ['node_modules/'])
})

test('deleteTaskFromConfig returns an error when the task does not exist', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-task-config-missing-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    syncTasks: [
      {
        displayName: 'A',
        rcloneRemote: 'synology',
        localBasePath: tempDir,
        remoteBasePath: 'A',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  assert.deepEqual(await deleteTaskFromConfig({
    rcloneRemote: 'synology',
    localBasePath: path.join(tempDir, 'missing'),
  }, { configPath }), {
    success: false,
    code: 'sync_task.not_found',
    message: 'Sync task was not found.',
  })
})
