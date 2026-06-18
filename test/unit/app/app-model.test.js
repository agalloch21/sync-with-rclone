import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createServersFromSyncTasks, listSyncTasks, loadAppModel, sortSyncTasks } from '#src/app/app-model.js'

async function createFakeRclone(dump) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-app-model-rclone-'))
  const executablePath = path.join(tempDir, 'rclone')

  await fs.writeFile(executablePath, `#!/usr/bin/env node
if (process.argv.includes('dump')) {
  process.stdout.write(${JSON.stringify(dump)})
}
`, 'utf8')
  await fs.chmod(executablePath, 0o755)

  return executablePath
}

test('sortSyncTasks sorts by server then local path without enriching task objects', () => {
  const syncTasks = sortSyncTasks([
    { displayName: 'Task B', rcloneRemote: 'server-b', localBasePath: '/b' },
    { displayName: 'Task A2', rcloneRemote: 'server-a', localBasePath: '/a/2' },
    { displayName: 'Task A1', rcloneRemote: 'server-a', localBasePath: '/a/1' },
    { displayName: 'Missing', rcloneRemote: 'server-missing', localBasePath: '/missing' },
  ])

  assert.deepEqual(syncTasks.map(task => [task.rcloneRemote, task.localBasePath, Object.hasOwn(task, 'remote')]), [
    ['server-a', '/a/1', false],
    ['server-a', '/a/2', false],
    ['server-b', '/b', false],
    ['server-missing', '/missing', false],
  ])
})

test('createServersFromSyncTasks creates app-facing server records with status', () => {
  const servers = createServersFromSyncTasks([
    { name: 'server-a', type: 'sftp', host: 'nas.local' },
    { name: 'server-b', type: 'ftp', host: 'ftp.local' },
  ], [
    { displayName: 'Task A', rcloneRemote: 'server-a' },
    { displayName: 'Task Missing', rcloneRemote: 'server-missing' },
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
        displayName: 'Projects',
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
  const bundledRclonePath = await createFakeRclone(JSON.stringify({ synology: { type: 'sftp', host: 'nas.local', user: 'xiaobo' } }))

  const model = await loadAppModel({
    bundledRclonePath,
    configPath,
    rcloneConfigPath,
  })

  assert.deepEqual(model.globalIgnorePatterns, ['.DS_Store'])
  assert.equal(model.syncTasks[0].displayName, 'Projects')
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
        displayName: 'B',
        rcloneRemote: 'server-b',
        localBasePath: './test/fixtures/local/b',
        remoteBasePath: 'B',
        ignorePatterns: [],
      },
      {
        displayName: 'A',
        rcloneRemote: 'server-a',
        localBasePath: './test/fixtures/local/a',
        remoteBasePath: 'A',
        ignorePatterns: [],
      },
    ],
  }, null, 2))

  const bundledRclonePath = await createFakeRclone(JSON.stringify({ 'server-a': { type: 'sftp' }, 'server-b': { type: 'sftp' } }))
  const syncTasks = await listSyncTasks({
    bundledRclonePath,
    configPath,
    rcloneConfigPath: '/app/rclone.conf',
  })

  assert.deepEqual(syncTasks.map(task => task.displayName), ['A', 'B'])
})
