import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createServersFromSyncTasks, listSyncTasks, loadAppModel, sortSyncTasks } from '#src/app/app-model.js'

test('sortSyncTasks sorts by server then task name without enriching task objects', () => {
  const syncTasks = sortSyncTasks([
    { name: 'Task B', rcloneRemote: 'server-b' },
    { name: 'Task A2', rcloneRemote: 'server-a' },
    { name: 'Task A1', rcloneRemote: 'server-a' },
    { name: 'Missing', rcloneRemote: 'server-missing' },
  ])

  assert.deepEqual(syncTasks.map(task => [task.rcloneRemote, task.name, Object.hasOwn(task, 'remote')]), [
    ['server-a', 'Task A1', false],
    ['server-a', 'Task A2', false],
    ['server-b', 'Task B', false],
    ['server-missing', 'Missing', false],
  ])
})

test('createServersFromSyncTasks creates app-facing server records with status', () => {
  const servers = createServersFromSyncTasks([
    { name: 'server-a', type: 'sftp', host: 'nas.local' },
    { name: 'server-b', type: 'ftp', host: 'ftp.local' },
  ], [
    { name: 'Task A', rcloneRemote: 'server-a' },
    { name: 'Task Missing', rcloneRemote: 'server-missing' },
  ])

  assert.deepEqual(servers, [
    { name: 'server-a', type: 'sftp', address: 'nas.local', options: { host: 'nas.local' }, status: 'unknown' },
    { name: 'server-b', type: 'ftp', address: 'ftp.local', options: { host: 'ftp.local' }, status: 'unknown' },
    { name: 'server-missing', type: null, address: '', options: {}, status: 'missing' },
  ])
})

test('loadAppModel returns full config data and enriched tasks', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-app-model-'))
  const configPath = path.join(tempDir, 'config.json')
  const rcloneConfigPath = path.join(tempDir, 'rclone.conf')

  await fs.writeFile(configPath, JSON.stringify({
    globalIgnorePatterns: ['.DS_Store'],
    syncTasks: [
      {
        name: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'Projects',
        ignorePatterns: [],
        lastSyncMode: 'push',
        lastSyncFolder: 'compare-push',
        lastSyncDate: '2026-06-13T00:00:00.000Z',
      },
    ],
  }, null, 2))
  await fs.writeFile(rcloneConfigPath, '[synology]\ntype = sftp\n')

  const runtime = {
    dependents: {
      async runCommand() {
        return { stdout: JSON.stringify({ synology: { type: 'sftp', host: 'nas.local', user: 'xiaobo' } }) }
      },
    },
  }

  const model = await loadAppModel({
    bundledRclonePath: '/bin/rclone',
    configPath,
    rcloneConfigPath,
  }, runtime)

  assert.deepEqual(model.globalIgnorePatterns, ['.DS_Store'])
  assert.equal(model.syncTasks[0].name, 'Projects')
  assert.deepEqual(model.servers, [
    {
      name: 'synology',
      type: 'sftp',
      address: 'nas.local',
      options: {
        host: 'nas.local',
        user: 'xiaobo',
      },
      status: 'unknown',
    },
  ])
  assert.equal(Object.hasOwn(model, 'remotes'), false)
})

test('listSyncTasks returns the flat sorted task list', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-list-tasks-'))
  const configPath = path.join(tempDir, 'config.json')

  await fs.writeFile(configPath, JSON.stringify({
    syncTasks: [
      {
        name: 'B',
        rcloneRemote: 'server-b',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'B',
        ignorePatterns: [],
      },
      {
        name: 'A',
        rcloneRemote: 'server-a',
        localBasePath: './test/fixtures/local',
        remoteBasePath: 'A',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  const syncTasks = await listSyncTasks({
    bundledRclonePath: '/bin/rclone',
    configPath,
    rcloneConfigPath: '/app/rclone.conf',
  }, {
    dependents: {
      async runCommand() {
        return { stdout: JSON.stringify({ 'server-a': { type: 'sftp' }, 'server-b': { type: 'sftp' } }) }
      },
    },
  })

  assert.deepEqual(syncTasks.map(task => task.name), ['A', 'B'])
})
