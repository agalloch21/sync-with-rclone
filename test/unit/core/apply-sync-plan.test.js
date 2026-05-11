import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import { applySyncPlan } from '#src/core/apply-sync-plan.js'

function normalizeFilesFromArg(args) {
  const normalizedArgs = [...args]
  const filesFromIndex = normalizedArgs.indexOf('--files-from')
  if (filesFromIndex !== -1)
    normalizedArgs[filesFromIndex + 1] = '<batch-file>'

  return normalizedArgs
}

async function readFilesFromArg(args) {
  const filesFromIndex = args.indexOf('--files-from')
  if (filesFromIndex === -1)
    return []

  const content = await fs.readFile(args[filesFromIndex + 1], 'utf8')
  return content.trimEnd().split('\n')
}

test('applySyncPlan targets local root for pull-mode delete cleanup', async () => {
  const commands = []

  await applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'delete', path: 'deleted/deleted.txt' },
    ],
  }, {
    mode: 'pull',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    dependents: {
      runCommand: async (command, args) => {
        commands.push({ command, args: normalizeFilesFromArg(args) })
        return { stdout: '', stderr: '' }
      },
    },
  })

  assert.deepEqual(commands.map(command => command.args.slice(0, 2)), [
    ['delete', '/local/root'],
    ['rmdirs', '/local/root'],
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
  const events = []

  const result = await applySyncPlan(syncPlan, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    events: {
      progress: event => events.push(event),
    },
    dependents: {
      runCommand: async (command, args) => {
        commands.push({ command, args: normalizeFilesFromArg(args) })
        const paths = await readFilesFromArg(args)
        if (paths.length > 0)
          batchFiles.push({ paths })

        return {
          stdout: '+ added/added.txt\n',
          stderr: '',
        }
      },
    },
  })

  assert.equal(result.action, 'confirm')
  assert.deepEqual(batchFiles, [
    {
      paths: ['added/added.txt', 'modified/modified.txt'],
    },
    {
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
        '--sftp-disable-hashcheck',
        '--files-from',
        '<batch-file>',
        '--use-json-log',
        '--log-level',
        'INFO',
        '--progress',
        '--stats',
        '500ms',
        '--stats-unit',
        'bytes',
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
        '<batch-file>',
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
  assert.deepEqual(result.operations, [
    { type: 'copy', path: 'added/added.txt', synced: true },
    { type: 'copy', path: 'modified/modified.txt', synced: true },
    { type: 'delete', path: 'deleted/deleted.txt', synced: true },
  ])
  assert.deepEqual(events, [
    { activity: 'start', index: 0, total: 5, measurement: null },
    { activity: 'copy', index: 1, total: 5, measurement: null },
    { activity: 'delete', index: 2, total: 5, measurement: null },
    { activity: 'cleanup', index: 3, total: 5, measurement: null },
    { activity: 'complete', index: 4, total: 5, measurement: null },
  ])
  assert.equal(result.phases, undefined)
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
      progress: event => events.push(event),
    },
    dependents: {
      runCommand: async () => ({ stdout: '', stderr: '' }),
    },
  })

  assert.deepEqual(events, [
    { activity: 'start', index: 0, total: 5, measurement: null },
    { activity: 'copy', index: 1, total: 5, measurement: null },
    { activity: 'complete', index: 4, total: 5, measurement: null },
  ])
})

test('applySyncPlan emits copy transfer progress from rclone output', async () => {
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
      bundledRclonePath: '/app/bin/rclone',
    },
  }, {
    events: {
      progress: event => events.push(event),
    },
    dependents: {
      runCommand: async (command, args, options) => {
        options.onOutput?.('Transferred:   1 MiB / 2 MiB, 50%, 1 MiB/s, ETA 1s\n')
        return { stdout: '', stderr: '' }
      },
    },
  })

  assert.ok(events.some(event => (
    event.activity === 'copy'
    && event.index === 1
    && event.total === 5
    && event.measurement?.current === 1024 ** 2
    && event.measurement?.total === 2 * 1024 ** 2
    && event.measurement?.unit === 'bytes'
  )))
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
    },
  }, abortController.signal), (error) => {
    assert.equal(error, originalError)
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'one.txt', synced: false },
      { type: 'copy', path: 'two.txt', synced: false },
    ])
    return true
  })
})

test('applySyncPlan preserves confirmed files from aborted rclone output', async () => {
  const abortController = new AbortController()
  const abortError = new Error('cancelled')
  abortError.stdout = [
    '+ one.txt',
    '{"level":"info","msg":"Copied (server-side copy)","object":"one.txt"}',
  ].join('\n')

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
    },
  }, abortController.signal), (error) => {
    assert.equal(error, abortError)
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'one.txt', synced: true },
      { type: 'copy', path: 'two.txt', synced: false },
    ])
    return true
  })
})

test('applySyncPlan ignores combined markers when copy fails', async () => {
  const copyError = new Error('copy failed')
  copyError.stdout = [
    '+ queued.txt',
    '= identical.txt',
    '* changed.txt',
    '! failed.txt',
  ].join('\n')

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'queued.txt' },
      { type: 'copy', path: 'identical.txt' },
      { type: 'copy', path: 'changed.txt' },
      { type: 'copy', path: 'failed.txt' },
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
        throw copyError
      },
    },
  }), (error) => {
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'queued.txt', synced: false },
      { type: 'copy', path: 'identical.txt', synced: false },
      { type: 'copy', path: 'changed.txt', synced: false },
      { type: 'copy', path: 'failed.txt', synced: false },
    ])
    return true
  })
})

test('applySyncPlan ignores failed and objectless JSON records when copy fails', async () => {
  const copyError = new Error('copy failed')
  copyError.stderr = [
    '{"level":"info","msg":"There was nothing to transfer"}',
    '{"level":"error","msg":"Failed to copy","object":"failed.txt"}',
    '{"level":"notice","msg":"Failed to copy","object":"notice.txt"}',
    '{"level":"info","msg":"Copied (server-side copy)","object":"copied.txt"}',
  ].join('\n')

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'failed.txt' },
      { type: 'copy', path: 'notice.txt' },
      { type: 'copy', path: 'copied.txt' },
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
        throw copyError
      },
    },
  }), (error) => {
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'failed.txt', synced: false },
      { type: 'copy', path: 'notice.txt', synced: false },
      { type: 'copy', path: 'copied.txt', synced: true },
    ])
    return true
  })
})

test('applySyncPlan marks confirmed delete operations when delete fails', async () => {
  const deleteError = new Error('delete failed')
  deleteError.stderr = '{"level":"info","msg":"Deleted","object":"one.txt"}\n'

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'delete', path: 'one.txt' },
      { type: 'delete', path: 'two.txt' },
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
      runCommand: async (command, args) => {
        if (args.includes('delete'))
          throw deleteError

        return { stdout: '', stderr: '' }
      },
    },
  }), (error) => {
    assert.equal(error, deleteError)
    assert.deepEqual(error.operations, [
      { type: 'delete', path: 'one.txt', synced: true },
      { type: 'delete', path: 'two.txt', synced: false },
    ])
    return true
  })
})

test('applySyncPlan preserves synced file operations when cleanup fails', async () => {
  const cleanupError = new Error('cleanup failed')

  await assert.rejects(() => applySyncPlan({
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'one.txt' },
      { type: 'delete', path: 'two.txt' },
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
      runCommand: async (command, args) => {
        if (args.includes('rmdirs'))
          throw cleanupError

        return { stdout: '', stderr: '' }
      },
    },
  }), (error) => {
    assert.equal(error, cleanupError)
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'one.txt', synced: true },
      { type: 'delete', path: 'two.txt', synced: true },
    ])
    return true
  })
})

test('applySyncPlan filters cancellation metadata to selected files', async () => {
  const abortController = new AbortController()
  const abortError = new Error('cancelled')
  abortError.stdout = [
    '{"level":"info","msg":"Copied (server-side copy)","object":"selected.txt"}',
    '{"level":"info","msg":"Copied (server-side copy)","object":"internal-cleanup-marker"}',
  ].join('\n')

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
    },
  }, abortController.signal), (error) => {
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'selected.txt', synced: true },
      { type: 'delete', path: 'deleted.txt', synced: false },
    ])
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
    },
  }, abortController.signal), (error) => {
    assert.equal(error.message, 'Apply cancelled')
    assert.equal(error.cause, 'cancelled')
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'one.txt', synced: false },
    ])
    return true
  })
})
