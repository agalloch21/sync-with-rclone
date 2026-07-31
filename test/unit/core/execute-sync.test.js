import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { SYNC_CANCEL_REASON, SYNC_PHASES, SYNC_RESULT } from '#src/core/contract.js'
import { executeSync } from '#src/core/execute-sync.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import { withFakeRcloneCommand } from '../../helpers/fake-rclone-command.js'

test('executeSync converts apply cancellation into a cancelled result with apply metadata', async () => {
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
      localFolderPath: path.posix.resolve('test/fixtures/local/compare-push'),
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
    assert.equal(result.phase, SYNC_PHASES.APPLY_PLAN)
    assert.ok(result.operations.length > 0)
    assert.ok(result.operations.some(operation => operation.type === 'copy' && operation.synced))
  })
})

test('executeSync returns apply operations when the real command boundary fails', async () => {
  await withFakeRcloneCommand({
    lsjson: { stdout: '[]' },
    copy: { confirmFirstPath: true, exitCode: 1 },
  }, async ({ runtimePaths }) => {
    const result = await executeSync({
      mode: 'push',
      localFolderPath: path.posix.resolve('test/fixtures/local/compare-push'),
      remoteFolderPath: 'fake-remote:compare-push',
      runtimePaths,
    })

    assert.equal(result.result, SYNC_RESULT.FAILED)
    assert.equal(result.phase, SYNC_PHASES.APPLY_PLAN)
    assert.equal(result.message, 'Failed to copy files.')
    assert.ok(result.error instanceof InfrastructureError)
    assert.equal(result.error.code, INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED)
    assert.match(result.error.cause.message, /exited with code 1/)
    assert.ok(result.operations.some(operation => operation.type === 'copy' && operation.synced))
  })
})
