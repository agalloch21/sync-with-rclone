import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createSyncTask, deleteTaskFromConfig, updateSyncTask } from '#src/app/configuration/task-operations.js'

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

test('createSyncTask saves a normalized mapping with default metadata', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-task-create-'))
  const configPath = path.join(tempDir, 'config.json')
  const localPath = path.join(tempDir, 'local')
  await fs.mkdir(localPath)
  await fs.writeFile(configPath, JSON.stringify({ globalIgnorePatterns: ['.DS_Store'], syncTasks: [] }))

  const result = await createSyncTask({
    rcloneRemote: ' synology ',
    localBasePath: localPath,
    remoteBasePath: 'Projects\\Current/',
  }, { configPath })

  assert.equal(result.rcloneRemote, 'synology')
  assert.equal(result.remoteBasePath, 'Projects/Current')
  assert.deepEqual(result.ignorePatterns, [])
  assert.equal(result.lastSyncDate, null)

  const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
  assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
  assert.equal(saved.syncTasks[0].localBasePath, localPath)
})

test('updateSyncTask changes the mapping and preserves task metadata', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-task-update-'))
  const configPath = path.join(tempDir, 'config.json')
  const currentPath = path.join(tempDir, 'current')
  const nextPath = path.join(tempDir, 'next')
  await fs.mkdir(currentPath)
  await fs.mkdir(nextPath)
  await fs.writeFile(configPath, JSON.stringify({
    globalIgnorePatterns: [],
    syncTasks: [{
      displayName: 'Project',
      rcloneRemote: 'synology',
      localBasePath: currentPath,
      remoteBasePath: 'Current',
      ignorePatterns: ['node_modules/'],
      lastSyncMode: 'push',
      lastSyncFolder: 'src',
      lastSyncDate: '2026-07-17',
    }],
  }))

  const result = await updateSyncTask({
    rcloneRemote: 'synology',
    localBasePath: currentPath,
  }, {
    rcloneRemote: 'synology',
    localBasePath: nextPath,
    remoteBasePath: 'Next',
  }, { configPath })

  assert.equal(result.displayName, 'Project')
  assert.deepEqual(result.ignorePatterns, ['node_modules/'])
  assert.equal(result.lastSyncMode, 'push')
  assert.equal(result.localBasePath, nextPath)
  assert.equal(result.remoteBasePath, 'Next')
})

test('updateSyncTask rejects a conflicting server and local folder pair', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-task-conflict-'))
  const configPath = path.join(tempDir, 'config.json')
  const localA = path.join(tempDir, 'a')
  const localB = path.join(tempDir, 'b')
  await fs.mkdir(localA)
  await fs.mkdir(localB)
  await fs.writeFile(configPath, JSON.stringify({
    syncTasks: [
      { rcloneRemote: 'synology', localBasePath: localA, remoteBasePath: 'A' },
      { rcloneRemote: 'synology', localBasePath: localB, remoteBasePath: 'B' },
    ],
  }))

  await assert.rejects(() => updateSyncTask({
    rcloneRemote: 'synology',
    localBasePath: localA,
  }, {
    rcloneRemote: 'synology',
    localBasePath: localB,
    remoteBasePath: 'Other',
  }, { configPath }), error => error?.code === 'sync_task.already_exists')
})
