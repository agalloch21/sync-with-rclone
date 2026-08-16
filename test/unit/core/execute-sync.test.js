import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { SYNC_CANCEL_REASON, SYNC_OPERATION_FAILURE_CODE, SYNC_OPERATION_STATUS, SYNC_RESULT } from '#src/core/contract.js'
import { executeSync } from '#src/core/execute-sync.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import { withFakeRcloneCommand } from '../../helpers/fake-rclone-command.js'
import { createTemporaryDirectory } from '../../helpers/temporary-files.js'

test('executeSync converts apply cancellation into a cancelled result with apply metadata', async (t) => {
  const localFolderPath = await createTemporaryDirectory(t, 'execute-sync-cancel-')
  await fs.writeFile(path.join(localFolderPath, 'local.txt'), 'local')

  await withFakeRcloneCommand({
    lsjson: { stdout: '[]' },
    copy: {
      stdout: 'Transferred:   1 MiB / 2 MiB, 50%, 1 MiB/s, ETA 1s\n',
      confirmFirstPath: true,
      delayMs: 2000,
    },
  }, async ({ runtimePaths }) => {
    const abortController = new AbortController()
    let abortScheduled = false

    const result = await executeSync({
      mode: 'push',
      localFolderPath,
      remoteFolderPath: 'fake-remote:compare-push',
      runtimePaths,
    }, {
      events: {
        eventListener(event) {
          if (!abortScheduled && event.progress?.measurement) {
            abortScheduled = true
            setTimeout(() => abortController.abort(new Error('cancelled')), 10)
          }
        },
      },
    }, abortController.signal)

    assert.equal(result.result, SYNC_RESULT.CANCELLED)
    assert.equal(result.reason, SYNC_CANCEL_REASON.ABORT_SIGNAL)
    assert.ok(result.operations.length > 0)
    assert.ok(result.operations.some(operation => operation.type === 'copy' && operation.status === 'synced'))
  })
})

test('executeSync returns apply operations when the real command boundary fails', async (t) => {
  const localFolderPath = await createTemporaryDirectory(t, 'execute-sync-failure-')
  await fs.writeFile(path.join(localFolderPath, 'local.txt'), 'local')

  await withFakeRcloneCommand({
    lsjson: { stdout: '[]' },
    copy: { confirmFirstPath: true, exitCode: 1 },
  }, async ({ runtimePaths }) => {
    const result = await executeSync({
      mode: 'push',
      localFolderPath,
      remoteFolderPath: 'fake-remote:compare-push',
      runtimePaths,
    })

    assert.equal(result.result, SYNC_RESULT.FAILED)
    assert.ok(result.error instanceof InfrastructureError)
    assert.equal(result.error.message, 'Failed to copy files.')
    assert.equal(result.error.code, INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED)
    assert.match(result.error.cause.message, /exited with code 1/)
    assert.ok(result.operations.some(operation => operation.type === 'copy' && operation.status === 'synced'))
  })
})

test('executeSync reports a symbolic-link operation failure after applying safe pull files', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pull-review-boundary-'))
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

    await withFakeRcloneCommand({
      lsjson: {
        stdout: JSON.stringify([{
          Path: 'assets/remote.txt',
          Size: 6,
          ModTime: '2026-08-15T00:00:00Z',
          IsDir: false,
        }, {
          Path: 'safe.txt',
          Size: 4,
          ModTime: '2026-08-15T00:00:00Z',
          IsDir: false,
        }]),
      },
    }, async ({ runtimePaths }) => {
      let reviewCalled = false
      const result = await executeSync({
        mode: 'pull',
        localFolderPath: localRoot,
        remoteFolderPath: 'fake-remote:project',
        runtimePaths,
      }, {
        interactions: {
          reviewDiff() {
            reviewCalled = true
            return Promise.resolve({ action: 'confirm' })
          },
        },
      })

      assert.equal(result.result, SYNC_RESULT.FAILED)
      assert.equal(reviewCalled, true)
      assert.deepEqual(result.operations, [
        {
          type: 'copy',
          path: 'assets/remote.txt',
          status: SYNC_OPERATION_STATUS.FAILED,
          failure: {
            code: SYNC_OPERATION_FAILURE_CODE.LOCAL_SYMBOLIC_LINK_BOUNDARY,
            meta: { symbolicLinkPath: 'assets' },
          },
        },
        {
          type: 'copy',
          path: 'safe.txt',
          status: SYNC_OPERATION_STATUS.SYNCED,
        },
      ])
    })
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})
