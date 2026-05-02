import assert from 'node:assert/strict'
import test from 'node:test'
import { applySyncPlan, buildApplyExecution } from '#src/core/apply-sync-plan.js'

test('buildApplyExecution groups remote push operations into phased execution', () => {
  const syncPlan = {
    action: 'confirm',
    operations: [
      { type: 'mkdir', path: 'added' },
      { type: 'copy', path: 'added/added.txt' },
      { type: 'copy', path: 'modified/modified.txt' },
      { type: 'delete', path: 'deleted/deleted.txt' },
      { type: 'rmdir', path: 'deleted' },
    ],
  }

  const execution = buildApplyExecution(syncPlan, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
  })

  assert.deepEqual(execution, {
    action: 'confirm',
    sourceRoot: '/local/root',
    destinationRoot: 'synology:ProjectsSynced/app',
    sourceKind: 'local',
    destinationKind: 'remote',
    phases: [
      {
        type: 'mkdir',
        description: 'creating directories',
        strategy: 'per-path-rclone',
        targetKind: 'remote',
        root: 'synology:ProjectsSynced/app',
        paths: ['added'],
      },
      {
        type: 'copy',
        description: 'copying files',
        strategy: 'batch-rclone-files-from',
        sourceKind: 'local',
        destinationKind: 'remote',
        sourceRoot: '/local/root',
        destinationRoot: 'synology:ProjectsSynced/app',
        paths: ['added/added.txt', 'modified/modified.txt'],
      },
      {
        type: 'delete',
        description: 'deleting files',
        strategy: 'batch-rclone-files-from',
        targetKind: 'remote',
        root: 'synology:ProjectsSynced/app',
        paths: ['deleted/deleted.txt'],
      },
      {
        type: 'rmdir',
        description: 'deleting directories',
        strategy: 'per-path-rclone',
        targetKind: 'remote',
        root: 'synology:ProjectsSynced/app',
        paths: ['deleted'],
      },
    ],
  })
})

test('applySyncPlan uses batched rclone commands for copy and delete phases', async () => {
  const syncPlan = {
    action: 'confirm',
    operations: [
      { type: 'mkdir', path: 'added' },
      { type: 'copy', path: 'added/added.txt' },
      { type: 'copy', path: 'modified/modified.txt' },
      { type: 'delete', path: 'deleted/deleted.txt' },
      { type: 'rmdir', path: 'deleted' },
    ],
  }

  const commands = []
  const batchFiles = []

  const result = await applySyncPlan(syncPlan, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async (command, args) => {
        commands.push({ command, args })
      },
      createBatchFile: async (paths) => {
        const filePath = `/tmp/mock-batch-${batchFiles.length}.txt`
        batchFiles.push({ filePath, paths })
        return filePath
      },
      removeBatchFile: async () => {},
    },
  })

  assert.equal(result.action, 'confirm')
  assert.deepEqual(batchFiles, [
    {
      filePath: '/tmp/mock-batch-0.txt',
      paths: ['added/added.txt', 'modified/modified.txt'],
    },
    {
      filePath: '/tmp/mock-batch-1.txt',
      paths: ['deleted/deleted.txt'],
    },
  ])
  assert.deepEqual(commands, [
    {
      command: '/app/bin/rclone',
      args: ['--config', '/app/rclone.conf', 'mkdir', 'synology:ProjectsSynced/app/added'],
    },
    {
      command: '/app/bin/rclone',
      args: [
        '--config',
        '/app/rclone.conf',
        'copy',
        '/local/root',
        'synology:ProjectsSynced/app',
        '--metadata',
        '--refresh-times',
        '--files-from',
        '/tmp/mock-batch-0.txt',
      ],
    },
    {
      command: '/app/bin/rclone',
      args: [
        '--config',
        '/app/rclone.conf',
        'delete',
        'synology:ProjectsSynced/app',
        '--files-from',
        '/tmp/mock-batch-1.txt',
      ],
    },
    {
      command: '/app/bin/rclone',
      args: ['--config', '/app/rclone.conf', 'rmdir', 'synology:ProjectsSynced/app/deleted'],
    },
  ])
})

test('applySyncPlan reports apply lifecycle events in execution order', async () => {
  const events = []

  await applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'mkdir', path: 'added' },
      { type: 'copy', path: 'added/added.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    events: {
      progress: (current, total, message) => events.push({ current, total, message }),
    },
    dependents: {
      runCommand: async () => {},
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async () => {},
    },
  })

  assert.deepEqual(events, [
    { current: 0, total: 3, message: 'start' },
    { current: 1, total: 3, message: 'mkdir' },
    { current: 2, total: 3, message: 'copy' },
    { current: 3, total: 3, message: 'complete' },
  ])
})
