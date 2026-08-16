import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { SYNC_OPERATION_FAILURE_CODE, SYNC_OPERATION_STATUS } from '#src/core/contract.js'
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

test('executeSyncPlan skips symbolic-link paths and applies other pull operations', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pull-plan-boundary-'))
  const localRoot = path.join(temporaryPath, 'local')
  const externalPath = path.join(temporaryPath, 'external')

  try {
    await fs.mkdir(localRoot)
    await fs.mkdir(externalPath)
    try {
      await fs.symlink(externalPath, path.join(localRoot, 'assets'), 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    await withFakeRcloneCommand({}, async ({ runtimePaths, readCalls }) => {
      await assert.rejects(
        () => executeSyncPlan({
          action: 'confirm',
          operations: [
            { type: 'copy', path: 'assets/remote.txt' },
            { type: 'copy', path: 'safe.txt' },
          ],
        }, {
          mode: 'pull',
          localFolderPath: localRoot,
          remoteFolderPath: 'synology:ProjectsSynced/app',
          runtimePaths,
        }),
        (error) => {
          assert.deepEqual(error.operations, [
            {
              type: 'copy',
              path: 'assets/remote.txt',
              status: SYNC_OPERATION_STATUS.FAILED,
              failure: {
                code: SYNC_OPERATION_FAILURE_CODE.LOCAL_SYMBOLIC_LINK_BOUNDARY,
                meta: { symbolicLinkPath: 'assets' },
              },
            },
            { type: 'copy', path: 'safe.txt', status: SYNC_OPERATION_STATUS.SYNCED },
          ])
          return true
        },
      )

      const calls = await readCalls()
      assert.deepEqual(calls.find(call => call.args.includes('copy'))?.paths, ['safe.txt'])
    })
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})

test('executeSyncPlan blocks a copy whose structural delete is stopped by a symbolic link', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pull-plan-structural-boundary-'))
  const localRoot = path.join(temporaryPath, 'local')
  const externalFile = path.join(temporaryPath, 'external.txt')

  try {
    await fs.mkdir(path.join(localRoot, 'tree'), { recursive: true })
    await fs.writeFile(externalFile, 'external')
    try {
      await fs.symlink(externalFile, path.join(localRoot, 'tree', 'child.txt'))
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    await withFakeRcloneCommand({}, async ({ runtimePaths, readCalls }) => {
      await assert.rejects(
        () => executeSyncPlan({
          action: 'confirm',
          operations: [
            { type: 'delete', path: 'tree/child.txt' },
            { type: 'copy', path: 'tree' },
          ],
        }, {
          mode: 'pull',
          localFolderPath: localRoot,
          remoteFolderPath: 'synology:ProjectsSynced/app',
          runtimePaths,
        }),
        (error) => {
          assert.equal(error.operations[0].failure.code, SYNC_OPERATION_FAILURE_CODE.LOCAL_SYMBOLIC_LINK_BOUNDARY)
          assert.equal(error.operations[1].failure.code, SYNC_OPERATION_FAILURE_CODE.STRUCTURAL_DEPENDENCY_FAILED)
          return true
        },
      )

      assert.deepEqual(await readCalls(), [])
    })
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
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
      [],
      ['added/added.txt', 'modified/modified.txt'],
      ['deleted/deleted.txt'],
      [],
    ])
    assert.deepEqual(calls.map(call => normalizeArgs(call.args)), [
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
      { type: 'copy', path: 'added/added.txt', status: 'synced' },
      { type: 'copy', path: 'modified/modified.txt', status: 'synced' },
      { type: 'delete', path: 'deleted/deleted.txt', status: 'synced' },
    ])
    assert.deepEqual(events, [
      { activity: 'start', index: 0, total: 6, measurement: null },
      { activity: 'resolve-conflicts', index: 1, total: 6, measurement: null },
      { activity: 'copy', index: 2, total: 6, measurement: null },
      { activity: 'delete', index: 3, total: 6, measurement: null },
      { activity: 'cleanup', index: 4, total: 6, measurement: null },
      { activity: 'complete', index: 5, total: 6, measurement: null },
    ])
  })
})

test('executeSyncPlan deletes structural conflicts before copying and ordinary deletes after copying', async () => {
  await withFakeRcloneCommand({}, async ({ runtimePaths, readCalls }) => {
    const result = await executeSyncPlan({
      action: 'confirm',
      operations: [
        { type: 'delete', path: 'blocked' },
        { type: 'copy', path: 'blocked/new.txt' },
        { type: 'delete', path: 'ordinary-delete.txt' },
      ],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    })

    const calls = await readCalls()
    assert.deepEqual(calls.map(call => call.args[0]), [
      'delete',
      'rmdirs',
      'copy',
      'delete',
      'rmdirs',
    ])
    assert.deepEqual(calls.map(call => call.paths), [
      ['blocked'],
      [],
      ['blocked/new.txt'],
      ['ordinary-delete.txt'],
      [],
    ])
    assert.equal(result.operations.every(operation => operation.status === 'synced'), true)
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
        { type: 'copy', path: 'one.txt', status: 'synced' },
        { type: 'copy', path: 'two.txt', status: 'pending' },
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
        { type: 'delete', path: 'one.txt', status: 'synced' },
        { type: 'delete', path: 'two.txt', status: 'pending' },
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
        { type: 'delete', path: 'two.txt' },
      ],
    }, {
      mode: 'push',
      localFolderPath: '/local/root',
      remoteFolderPath: 'synology:ProjectsSynced/app',
      runtimePaths,
    }), (error) => {
      assert.deepEqual(error.operations, [
        { type: 'delete', path: 'two.txt', status: 'synced' },
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
      { type: 'copy', path: 'one.txt', status: 'pending' },
    ])
    return true
  })
})
