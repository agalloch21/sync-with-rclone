import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import {
  OPERATION_REPORT_ACKNOWLEDGEMENT,
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/operation-report-contract.js'
import {
  APP_OPERATION,
  createOperationReporter,
  SERVER_CREATE_PROGRESS_STEP,
} from '#src/app/operation-reporter.js'

function createDisplayCalls() {
  const calls = []
  return {
    calls,
    display: {
      open(state) {
        calls.push({ method: 'open', state })
        return Promise.resolve(OPERATION_REPORT_ACKNOWLEDGEMENT.CONFIRMED)
      },
      update(state) {
        calls.push({ method: 'update', state })
      },
      close(result) {
        calls.push({ method: 'close', result })
      },
    },
  }
}

test('createOperationReporter assembles operation and step report states', () => {
  const { calls, display } = createDisplayCalls()
  const reporter = createOperationReporter(APP_OPERATION.CREATE_SERVER, display)

  reporter.step(SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION, { serverName: 'synology' })

  assert.deepEqual(calls, [
    {
      method: 'open',
      state: {
        mode: OPERATION_REPORT_MODE.PROGRESS,
        key: `operations.${APP_OPERATION.CREATE_SERVER}`,
      },
    },
    {
      method: 'update',
      state: {
        mode: OPERATION_REPORT_MODE.PROGRESS,
        key: `operations.${APP_OPERATION.CREATE_SERVER}.steps.${SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION}`,
        params: { serverName: 'synology' },
      },
    },
  ])
})

test('createOperationReporter assembles success, error, and close states', async () => {
  const successCalls = createDisplayCalls()
  const successReporter = createOperationReporter(APP_OPERATION.CREATE_SERVER, successCalls.display)
  await successReporter.succeed(true)
  assert.deepEqual(successCalls.calls.at(-1), {
    method: 'update',
    state: {
      mode: OPERATION_REPORT_MODE.MESSAGE,
      level: OPERATION_REPORT_LEVEL.SUCCESS,
      key: `operations.${APP_OPERATION.CREATE_SERVER}.succeeded`,
    },
  })

  const errorCalls = createDisplayCalls()
  const errorReporter = createOperationReporter(APP_OPERATION.CREATE_SERVER, errorCalls.display)
  await errorReporter.error(new AppError({
    code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
    message: 'Connection failed.',
    detail: 'Authentication rejected.',
  }))
  assert.deepEqual(errorCalls.calls.at(-1), {
    method: 'update',
    state: {
      mode: OPERATION_REPORT_MODE.MESSAGE,
      level: OPERATION_REPORT_LEVEL.ERROR,
      key: `errors.${APP_ERROR_CODE.SERVER_CONNECTION_FAILED}`,
      params: {},
      detail: 'Authentication rejected.',
    },
  })

  const closeCalls = createDisplayCalls()
  const closeReporter = createOperationReporter(APP_OPERATION.CREATE_SERVER, closeCalls.display)
  await closeReporter.close(OPERATION_REPORT_ACKNOWLEDGEMENT.CANCELLED)
  assert.deepEqual(closeCalls.calls.at(-1), {
    method: 'close',
    result: OPERATION_REPORT_ACKNOWLEDGEMENT.CANCELLED,
  })
})

test('createOperationReporter closes unacknowledged success and validates dependencies', async () => {
  const { calls, display } = createDisplayCalls()
  const reporter = createOperationReporter(APP_OPERATION.CREATE_SERVER, display)
  await reporter.succeed(false)
  assert.deepEqual(calls.at(-1), {
    method: 'close',
    result: OPERATION_REPORT_ACKNOWLEDGEMENT.CONFIRMED,
  })

  assert.throws(
    () => createOperationReporter('', display),
    /Operation must be a non-empty string/,
  )
  assert.throws(
    () => createOperationReporter(APP_OPERATION.CREATE_SERVER, {}),
    /requires open/,
  )
})
