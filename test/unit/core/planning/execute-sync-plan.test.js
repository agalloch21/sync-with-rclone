import assert from 'node:assert/strict'
import test from 'node:test'
import { executeSyncPlan } from '#src/core/planning/execute-sync-plan.js'
import { withFakeRcloneCommand } from '../../../helpers/fake-rclone-command.js'

function normalizeArgs(args) {
  const normalizedArgs = [...args]
  const filesFromIndex = normalizedArgs.indexOf('--files-from')
  if (filesFromIndex !== -1)
    normalizedArgs[filesFromIndex + 1] = '<batch-file>'
  return normalizedArgs
}

test('executeSyncPlan returns a cancelled result without executing an unconfirmed plan', async () => {
  const result = await executeSyncPlan({ action: 'cancel', operations: [] }, {})

  assert.deepEqual(result, {
    action: 'cancel',
    operations: [],
  })
})

test('executeSyncPlan targets the local root for pull-mode delete cleanup', async () => {
  await withFakeRcloneCommand({}, async ({ runtimePaths, readCalls }) => {
    await executeSyncPlan({
      action: 'confirm',
      operations: [{ type: 'delete', path: 'deleted/deleted.txt' }],
    }, {
      mode: 'pull',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    })

    const calls = await readCalls()
    assert.deepEqual(calls.map(call => call.args.slice(0, 2)), [
      ['delete', '/local/root'],
      ['rmdirs', '/local/root'],
    ])
  })
})

test('executeSyncPlan batches copy and delete operations and reports their lifecycle', async () => {
  await withFakeRcloneCommand({}, async ({ runtimePaths, readCalls }) => {
    const events = []
    const result = await executeSyncPlan({
      action: 'confirm',
      operations: [
        { type: 'copy', path: 'added/added.txt' },
        { type: 'copy', path: 'modified/modified.txt' },
        { type: 'delete', path: 'deleted/deleted.txt' },
      ],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths: {
        ...runtimePaths,
        rcloneConfigPath: '/app/rclone.conf',
      },
    }, event => events.push(event))

    const calls = await readCalls()
    assert.deepEqual(calls.map(call => call.paths), [
      ['added/added.txt', 'modified/modified.txt'],
      ['deleted/deleted.txt'],
      [],
    ])
    assert.deepEqual(calls.map(call => normalizeArgs(call.args)), [
      [
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
      [
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
      [
        '--config',
        '/app/rclone.conf',
        'rmdirs',
        'synology:ProjectsSynced/app',
        '--leave-root',
        '--use-json-log',
        '--log-level',
        'INFO',
      ],
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
  })
})

test('executeSyncPlan reports transfer progress emitted by rclone', async () => {
  await withFakeRcloneCommand({
    copy: {
      stdout: 'Transferred:   1 MiB / 2 MiB, 50%, 1 MiB/s, ETA 1s\n',
    },
  }, async ({ runtimePaths }) => {
    const events = []
    await executeSyncPlan({
      action: 'confirm',
      operations: [{ type: 'copy', path: 'added/added.txt' }],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    }, event => events.push(event))

    assert.ok(events.some(event => (
      event.activity === 'copy'
      && event.measurement?.current === 1024 ** 2
      && event.measurement?.total === 2 * 1024 ** 2
      && event.measurement?.unit === 'bytes'
    )))
  })
})

test('executeSyncPlan preserves confirmed copy operations when rclone fails', async () => {
  await withFakeRcloneCommand({
    copy: { confirmFirstPath: true, exitCode: 1 },
  }, async ({ runtimePaths }) => {
    await assert.rejects(() => executeSyncPlan({
      action: 'confirm',
      operations: [
        { type: 'copy', path: 'one.txt' },
        { type: 'copy', path: 'two.txt' },
      ],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    }), (error) => {
      assert.deepEqual(error.operations, [
        { type: 'copy', path: 'one.txt', synced: true },
        { type: 'copy', path: 'two.txt', synced: false },
      ])
      return true
    })
  })
})

test('executeSyncPlan preserves confirmed delete operations when rclone fails', async () => {
  await withFakeRcloneCommand({
    delete: { confirmFirstPath: true, exitCode: 1 },
  }, async ({ runtimePaths }) => {
    await assert.rejects(() => executeSyncPlan({
      action: 'confirm',
      operations: [
        { type: 'delete', path: 'one.txt' },
        { type: 'delete', path: 'two.txt' },
      ],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    }), (error) => {
      assert.deepEqual(error.operations, [
        { type: 'delete', path: 'one.txt', synced: true },
        { type: 'delete', path: 'two.txt', synced: false },
      ])
      return true
    })
  })
})

test('executeSyncPlan preserves completed operations when cleanup fails', async () => {
  await withFakeRcloneCommand({
    rmdirs: { exitCode: 1 },
  }, async ({ runtimePaths }) => {
    await assert.rejects(() => executeSyncPlan({
      action: 'confirm',
      operations: [
        { type: 'copy', path: 'one.txt' },
        { type: 'delete', path: 'two.txt' },
      ],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    }), (error) => {
      assert.deepEqual(error.operations, [
        { type: 'copy', path: 'one.txt', synced: true },
        { type: 'delete', path: 'two.txt', synced: true },
      ])
      return true
    })
  })
})

test('executeSyncPlan attaches apply metadata to a pre-existing cancellation', async () => {
  const abortController = new AbortController()
  abortController.abort('cancelled')

  await assert.rejects(() => executeSyncPlan({
    action: 'confirm',
    operations: [{ type: 'copy', path: 'one.txt' }],
  }, {
    mode: 'push',
    localFolderPath: '/local/root',
    remoteFolderPath: 'synology:ProjectsSynced/app',
    runtimePaths: {},
  }, null, abortController.signal), (error) => {
    assert.equal(error.message, 'Apply cancelled')
    assert.equal(error.cause, 'cancelled')
    assert.deepEqual(error.operations, [
      { type: 'copy', path: 'one.txt', synced: false },
    ])
    return true
  })
})
