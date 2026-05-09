import assert from 'node:assert/strict'
import test from 'node:test'
import { applySyncPlan, buildApplyExecution } from '#src/core/apply-sync-plan.js'

test('buildApplyExecution groups file operations into copy and delete phases only', () => {
  const syncPlan = {
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'added/added.txt' },
      { type: 'copy', path: 'modified/modified.txt' },
      { type: 'delete', path: 'deleted/deleted.txt' },
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
        type: 'cleanup-empty-dirs',
        description: 'deleting empty directories',
        strategy: 'rclone-rmdirs',
        targetKind: 'remote',
        root: 'synology:ProjectsSynced/app',
        paths: [],
      },
    ],
  })
})

test('buildApplyExecution targets local root for pull-mode delete cleanup', () => {
  const execution = buildApplyExecution({
    action: 'confirm',
    operations: [
      { type: 'delete', path: 'deleted/deleted.txt' },
    ],
  }, {
    mode: 'pull',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
  })

  assert.deepEqual(execution.phases, [
    {
      type: 'delete',
      description: 'deleting files',
      strategy: 'batch-rclone-files-from',
      targetKind: 'local',
      root: '/local/root',
      paths: ['deleted/deleted.txt'],
    },
    {
      type: 'cleanup-empty-dirs',
      description: 'deleting empty directories',
      strategy: 'rclone-rmdirs',
      targetKind: 'local',
      root: '/local/root',
      paths: [],
    },
  ])
})

test('applySyncPlan uses batched rclone copy and delete with rmdirs cleanup', async () => {
  const syncPlan = {
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'added/added.txt' },
      { type: 'copy', path: 'modified/modified.txt' },
      { type: 'delete', path: 'deleted/deleted.txt' },
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
        return {
          stdout: '+ added/added.txt\n',
          stderr: '',
        }
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
        '--use-json-log',
        '--log-level',
        'INFO',
        '--combined',
        '-',
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
        '--rmdirs',
        '--use-json-log',
        '--log-level',
        'INFO',
      ],
    },
    {
      command: '/app/bin/rclone',
      args: [
        '--config',
        '/app/rclone.conf',
        'rmdirs',
        'synology:ProjectsSynced/app',
        '--leave-root',
        '--use-json-log',
        '--log-level',
        'INFO',
      ],
    },
  ])
  assert.deepEqual(result.plannedFiles, ['added/added.txt', 'modified/modified.txt', 'deleted/deleted.txt'])
  assert.deepEqual(result.confirmedFiles, ['added/added.txt', 'modified/modified.txt', 'deleted/deleted.txt'])
})

test('applySyncPlan removes batch files after successful batch commands', async () => {
  const removedBatchFiles = []

  await applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'one.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async () => ({ stdout: '', stderr: '' }),
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async filePath => removedBatchFiles.push(filePath),
    },
  })

  assert.deepEqual(removedBatchFiles, ['/tmp/mock-batch.txt'])
})

test('applySyncPlan removes batch files after failed batch commands', async () => {
  const removedBatchFiles = []

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'one.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async () => {
        throw new Error('copy failed')
      },
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async filePath => removedBatchFiles.push(filePath),
    },
  }), /copy failed/)

  assert.deepEqual(removedBatchFiles, ['/tmp/mock-batch.txt'])
})

test('applySyncPlan reports apply lifecycle events in execution order', async () => {
  const events = []

  await applySyncPlan({
    action: 'confirm',
    operations: [
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
      runCommand: async () => ({ stdout: '', stderr: '' }),
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async () => {},
    },
  })

  assert.deepEqual(events, [
    { current: 0, total: 2, message: 'start' },
    { current: 1, total: 2, message: 'copy' },
    { current: 2, total: 2, message: 'complete' },
  ])
})

test('applySyncPlan attaches apply metadata to the original cancellation error', async () => {
  const abortController = new AbortController()
  abortController.abort()
  const originalError = abortController.signal.reason

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'one.txt' },
      { type: 'copy', path: 'two.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async () => {
        throw abortController.signal.reason
      },
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async () => {},
    },
  }, abortController.signal), (error) => {
    assert.equal(error, originalError)
    assert.deepEqual(error.plannedFiles, ['one.txt', 'two.txt'])
    assert.deepEqual(error.confirmedFiles, [])
    return true
  })
})

test('applySyncPlan preserves confirmed files from aborted rclone output', async () => {
  const abortController = new AbortController()
  const abortError = new Error('cancelled')
  abortError.stdout = '+ one.txt\n'

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'one.txt' },
      { type: 'copy', path: 'two.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async () => {
        abortController.abort(abortError)
        throw abortError
      },
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async () => {},
    },
  }, abortController.signal), (error) => {
    assert.equal(error, abortError)
    assert.deepEqual(error.plannedFiles, ['one.txt', 'two.txt'])
    assert.deepEqual(error.confirmedFiles, ['one.txt'])
    return true
  })
})

test('applySyncPlan filters cancellation metadata to selected files', async () => {
  const abortController = new AbortController()
  const abortError = new Error('cancelled')
  abortError.stdout = '+ selected.txt\n+ internal-cleanup-marker\n'

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'selected.txt' },
      { type: 'delete', path: 'deleted.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async () => {
        abortController.abort(abortError)
        throw abortError
      },
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async () => {},
    },
  }, abortController.signal), (error) => {
    assert.deepEqual(error.plannedFiles, ['selected.txt', 'deleted.txt'])
    assert.deepEqual(error.confirmedFiles, ['selected.txt'])
    return true
  })
})

test('applySyncPlan wraps primitive cancellation reasons with apply metadata', async () => {
  const abortController = new AbortController()
  abortController.abort('cancelled')

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'one.txt' },
    ],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async () => {
        throw abortController.signal.reason
      },
      createBatchFile: async () => '/tmp/mock-batch.txt',
      removeBatchFile: async () => {},
    },
  }, abortController.signal), (error) => {
    assert.equal(error.message, 'Apply cancelled')
    assert.equal(error.cause, 'cancelled')
    assert.deepEqual(error.plannedFiles, ['one.txt'])
    assert.deepEqual(error.confirmedFiles, [])
    return true
  })
})
