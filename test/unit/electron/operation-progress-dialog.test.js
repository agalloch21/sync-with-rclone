import assert from 'node:assert/strict'
import test from 'node:test'
import { throwAppError } from '#src/app/app-errors.js'
import { MESSAGE_BOX_LEVEL, MESSAGE_BOX_MODE, MESSAGE_BOX_RESULT } from '#src/app/main-window/message-box-contract.js'
import { APP_OPERATION, OPERATION_PROGRESS_STATUS, SERVER_CREATE_PROGRESS_STEP } from '#src/app/operation-progress-contract.js'
import { reportOperationProgress } from '#src/app/operation-progress.js'
import { createOperationProgressDialogController } from '#src/electron/main/operation-progress-dialog.js'

function createControllerHarness() {
  const opened = []
  const updated = []
  const closed = []
  let resolveAcknowledgement = null

  const runProgressOperation = createOperationProgressDialogController({
    createOperationId: () => 'main-operation-id',
    openMessageBox(payload) {
      opened.push(payload)
      return new Promise((resolve) => {
        resolveAcknowledgement = resolve
      })
    },
    updateMessageBox(payload) {
      updated.push(payload)
      if (payload.mode === MESSAGE_BOX_MODE.MESSAGE)
        resolveAcknowledgement(MESSAGE_BOX_RESULT.CONFIRMED)
    },
    closeMessageBox(result) {
      closed.push(result)
      resolveAcknowledgement(result)
    },
  })

  return { runProgressOperation, opened, updated, closed }
}

test('main progress controller owns the operation id, progress, and successful close', async () => {
  const harness = createControllerHarness()

  const result = await harness.runProgressOperation({
    operation: APP_OPERATION.CREATE_SERVER,
    async execute() {
      await Promise.resolve()
      reportOperationProgress({
        step: SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION,
        status: OPERATION_PROGRESS_STATUS.STARTED,
      })
      return 'created'
    },
  })

  assert.equal(harness.opened[0].mode, MESSAGE_BOX_MODE.PROGRESS)
  assert.deepEqual(harness.updated[0].progress, {
    operationId: 'main-operation-id',
    operation: APP_OPERATION.CREATE_SERVER,
    step: SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION,
    status: OPERATION_PROGRESS_STATUS.STARTED,
  })
  assert.deepEqual(harness.closed, [MESSAGE_BOX_RESULT.CONFIRMED])
  assert.deepEqual(result, { success: true, value: 'created' })
})

test('main progress controller shows an AppError as a warning and waits for acknowledgement', async () => {
  const harness = createControllerHarness()

  const result = await harness.runProgressOperation({
    operation: APP_OPERATION.CREATE_SERVER,
    async execute() {
      throwAppError('server.connection_failed', 'Server connection failed.', {
        detail: 'Connection refused.',
      })
    },
  })

  assert.equal(harness.updated.at(-1).mode, MESSAGE_BOX_MODE.MESSAGE)
  assert.equal(harness.updated.at(-1).level, MESSAGE_BOX_LEVEL.WARNING)
  assert.equal(harness.updated.at(-1).message, 'Server connection failed.')
  assert.equal(harness.updated.at(-1).detail, 'Connection refused.')
  assert.equal(harness.updated.at(-1).progress, null)
  assert.deepEqual(harness.closed, [])
  assert.equal(result.success, false)
  assert.equal(result.error.code, 'server.connection_failed')
})

test('main progress controller presents unexpected failures as errors', async () => {
  const harness = createControllerHarness()

  const result = await harness.runProgressOperation({
    operation: APP_OPERATION.CREATE_SERVER,
    async execute() {
      throw new Error('Unexpected failure')
    },
  })

  assert.equal(harness.updated.at(-1).level, MESSAGE_BOX_LEVEL.ERROR)
  assert.equal(harness.updated.at(-1).message, 'Unexpected failure')
  assert.equal(result.success, false)
})
