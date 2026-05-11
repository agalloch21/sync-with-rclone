import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { PHASES, SYNC_CANCEL_REASON, SYNC_RESULT } from '#src/core/contract.js'
import { syncCore } from '#src/core/sync-engine.js'

function readFirstBatchPath(args) {
  const batchFilePath = args[args.indexOf('--files-from') + 1]
  return fs.readFileSync(batchFilePath, 'utf8').trim().split(/\r?\n/)[0]
}

test('syncCore converts apply cancellation into a cancelled result with apply metadata', async () => {
  const abortController = new AbortController()
  let confirmedPath = ''

  const result = await syncCore({
    mode: 'push',
    localFolderPath: path.posix.resolve('test/fixtures/local/compare-push'),
    remoteFolderPath: 'fake-remote:compare-push',
    runtimePaths: {
      bundledRclonePath: path.posix.resolve('resources/binaries/rclone-osx-arm64'),
    },
  }, {
    dependents: {
      runCommand: async (_command, args) => {
        confirmedPath = readFirstBatchPath(args)
        const abortError = new Error('cancelled')
        abortError.stdout = `{"level":"info","msg":"Copied (server-side copy)","object":"${confirmedPath}"}\n`
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
    operation.path === confirmedPath
    && operation.type === 'copy'
    && operation.synced
  )))
})

test('syncCore returns apply operations when apply fails', async () => {
  let confirmedPath = ''

  const result = await syncCore({
    mode: 'push',
    localFolderPath: path.posix.resolve('test/fixtures/local/compare-push'),
    remoteFolderPath: 'fake-remote:compare-push',
    runtimePaths: {
      bundledRclonePath: path.posix.resolve('resources/binaries/rclone-osx-arm64'),
    },
  }, {
    dependents: {
      runCommand: async (_command, args) => {
        confirmedPath = readFirstBatchPath(args)
        const applyError = new Error('copy failed')
        applyError.stdout = `{"level":"info","msg":"Copied (server-side copy)","object":"${confirmedPath}"}\n`
        throw applyError
      },
    },
  })

  assert.equal(result.result, SYNC_RESULT.FAILED)
  assert.equal(result.phase, PHASES.APPLY_PLAN)
  assert.equal(result.message, 'copy failed')
  assert.ok(result.operations.some(operation => (
    operation.path === confirmedPath
    && operation.type === 'copy'
    && operation.synced
  )))
})
