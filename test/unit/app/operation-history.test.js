import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { startSync } from '#src/app/app-api.js'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import {
  defineAppOperation,
  listOperationHistory,
  OPERATION_HISTORY_STATUS,
  runOperationWithHistory,
} from '#src/app/operations/operation-history.js'
import { acquireSyncAdmission, releaseSyncAdmission } from '#src/app/operations/sync/admission.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'

async function withHistoryRuntime(callback) {
  const appRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-history-'))
  const originalAppRoot = process.env.APP_ROOT_PATH
  process.env.APP_ROOT_PATH = appRoot

  try {
    return await callback(appRoot)
  }
  finally {
    if (originalAppRoot === undefined)
      delete process.env.APP_ROOT_PATH
    else
      process.env.APP_ROOT_PATH = originalAppRoot
  }
}

test('defineAppOperation records started and succeeded without changing the result', async () => {
  await withHistoryRuntime(async () => {
    const operation = defineAppOperation({
      operation: 'example.create',
      getSubject: ([name]) => ({ type: 'example', name }),
    }, async name => ({ name }))

    assert.deepEqual(await operation('demo'), { name: 'demo' })

    const records = await listOperationHistory()
    assert.equal(records.length, 2)
    assert.equal(records[0].status, OPERATION_HISTORY_STATUS.SUCCEEDED)
    assert.equal(records[1].status, OPERATION_HISTORY_STATUS.STARTED)
    assert.equal(records[0].operationId, records[1].operationId)
    assert.deepEqual(records[0].subject, { type: 'example', name: 'demo' })
  })
})

test('operation history records a safe failure summary and rethrows the original error', async () => {
  await withHistoryRuntime(async () => {
    const expectedError = new AppError({
      code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
      message: 'Connection failed.',
      detail: 'Private diagnostic detail.',
      meta: { pass: 'secret' },
    })

    await assert.rejects(
      () => runOperationWithHistory({
        operation: 'example.failure',
        subject: { type: 'server', name: 'NAS' },
      }, async () => {
        throw expectedError
      }),
      error => error === expectedError,
    )

    const records = await listOperationHistory()
    assert.equal(records[0].status, OPERATION_HISTORY_STATUS.FAILED)
    assert.deepEqual(records[0].error, {
      code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
      message: 'Connection failed.',
    })
    assert.equal(JSON.stringify(records).includes('secret'), false)
    assert.equal(JSON.stringify(records).includes('Private diagnostic detail'), false)
  })
})

test('operation history can derive a cancelled terminal status from an unchanged result contract', async () => {
  await withHistoryRuntime(async () => {
    const result = { result: 'cancelled', reason: 'user-cancelled' }
    const returned = await runOperationWithHistory({
      operation: 'example.cancel',
      resolveResult(value) {
        return {
          status: value.result === 'cancelled'
            ? OPERATION_HISTORY_STATUS.CANCELLED
            : OPERATION_HISTORY_STATUS.SUCCEEDED,
        }
      },
    }, async () => result)

    assert.equal(returned, result)
    const records = await listOperationHistory()
    assert.equal(records[0].status, OPERATION_HISTORY_STATUS.CANCELLED)
  })
})

test('operation history reader skips malformed lines and applies its limit newest-first', async () => {
  await withHistoryRuntime(async (appRoot) => {
    const operation = defineAppOperation({
      operation: 'example.read',
    }, async () => undefined)

    await operation()
    await operation()
    await fs.appendFile(
      path.join(appRoot, 'logs', 'operation-history.jsonl'),
      '{malformed\n',
      'utf8',
    )

    const records = await listOperationHistory({ limit: 2 })
    assert.equal(records.length, 2)
    assert.equal(records[0].status, OPERATION_HISTORY_STATUS.SUCCEEDED)
    assert.equal(records[1].status, OPERATION_HISTORY_STATUS.STARTED)
    assert.equal(records[0].operationId, records[1].operationId)
  })
})

test('startSync records its failed result and exposes an existing launcher log', async () => {
  await withHistoryRuntime(async (appRoot) => {
    const logPath = path.join(appRoot, 'logs', 'quick-actions.log')
    await fs.mkdir(path.dirname(logPath), { recursive: true })
    await fs.writeFile(logPath, 'request submitted\n', 'utf8')

    const result = await startSync({
      mode: 'push',
      localFolderPath: '/local/project',
      bypassConfig: true,
    })

    assert.equal(result.result, 'failed')
    assert.equal(result.message, 'remoteFolderPath is required when bypassConfig is enabled')
    assert.equal(result.logPath, logPath)

    const records = await listOperationHistory()
    assert.equal(records[0].operation, 'syncPush')
    assert.equal(records[0].status, OPERATION_HISTORY_STATUS.FAILED)
    assert.equal(records[1].status, OPERATION_HISTORY_STATUS.STARTED)
  })
})

test('startSync rejects an overlapping session before writing operation history', async () => {
  await withHistoryRuntime(async (appRoot) => {
    const localFolderPath = path.join(appRoot, 'project')
    await fs.mkdir(localFolderPath)
    const options = {
      mode: 'push',
      localFolderPath,
      remoteFolderPath: 'nas:remote/project',
      bypassConfig: true,
    }
    const runtimePaths = getRuntimePaths()
    const activeAdmission = await acquireSyncAdmission(options, runtimePaths)

    try {
      const result = await startSync(options)
      assert.equal(result.result, 'failed')
      assert.equal(result.errorCode, APP_ERROR_CODE.SYNC_SESSION_OVERLAP)
      assert.deepEqual(await listOperationHistory(), [])
    }
    finally {
      await releaseSyncAdmission(activeAdmission, runtimePaths)
    }
  })
})

test('startSync keeps pre-execution aborts as cancelled results', async () => {
  await withHistoryRuntime(async (appRoot) => {
    const localFolderPath = path.join(appRoot, 'project')
    const configDirectory = path.join(appRoot, 'config')
    await fs.mkdir(localFolderPath)
    await fs.mkdir(configDirectory)
    await fs.writeFile(path.join(configDirectory, 'config.json'), JSON.stringify({
      globalIgnorePatterns: [],
      syncTasks: [{
        displayName: 'Project',
        rcloneRemote: 'nas',
        localBasePath: localFolderPath,
        remoteBasePath: 'remote/project',
        ignorePatterns: [],
      }],
    }))

    const controller = new AbortController()
    controller.abort(new Error('cancelled by user'))
    const result = await startSync({
      mode: 'push',
      localFolderPath,
    }, {}, controller.signal)

    assert.equal(result.result, 'cancelled')
    assert.equal(result.reason, 'abort-signal')
    assert.equal((await listOperationHistory())[0].status, OPERATION_HISTORY_STATUS.CANCELLED)
  })
})
