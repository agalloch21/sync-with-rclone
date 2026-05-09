import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { PHASES, SYNC_CANCEL_REASON, SYNC_RESULT } from '#src/core/contract.js'
import { syncCore } from '#src/core/sync-engine.js'

test('syncCore converts apply cancellation into a cancelled result with apply metadata', async () => {
  const abortController = new AbortController()
  const abortError = new Error('cancelled')
  abortError.stdout = '{"level":"info","msg":"Copied (server-side copy)","object":"modified/modified.txt"}\n'

  const result = await syncCore({
    mode: 'push',
    localFolderPath: path.posix.resolve('test/fixtures/local/compare-push'),
    remoteFolderPath: 'fake-remote:compare-push',
    runtimePaths: {
      bundledRclonePath: path.posix.resolve('resources/binaries/rclone-osx-arm64'),
    },
  }, {
    dependents: {
      runCommand: async () => {
        abortController.abort(abortError)
        throw abortError
      },
    },
  }, abortController.signal)

  assert.equal(result.result, SYNC_RESULT.CANCELLED)
  assert.equal(result.reason, SYNC_CANCEL_REASON.ABORT_SIGNAL)
  assert.equal(result.phase, PHASES.APPLY_PLAN)
  assert.ok(result.operations.length > 0)
  assert.ok(result.operations.some(operation => (
    operation.path === 'modified/modified.txt'
    && operation.type === 'copy'
    && operation.synced
  )))
})

test('syncCore returns apply operations when apply fails', async () => {
  const applyError = new Error('copy failed')
  applyError.stdout = '{"level":"info","msg":"Copied (server-side copy)","object":"modified/modified.txt"}\n'

  const result = await syncCore({
    mode: 'push',
    localFolderPath: path.posix.resolve('test/fixtures/local/compare-push'),
    remoteFolderPath: 'fake-remote:compare-push',
    runtimePaths: {
      bundledRclonePath: path.posix.resolve('resources/binaries/rclone-osx-arm64'),
    },
  }, {
    dependents: {
      runCommand: async () => {
        throw applyError
      },
    },
  })

  assert.equal(result.result, SYNC_RESULT.FAILED)
  assert.equal(result.phase, PHASES.APPLY_PLAN)
  assert.equal(result.message, 'copy failed')
  assert.ok(result.operations.some(operation => (
    operation.path === 'modified/modified.txt'
    && operation.type === 'copy'
    && operation.synced
  )))
})
