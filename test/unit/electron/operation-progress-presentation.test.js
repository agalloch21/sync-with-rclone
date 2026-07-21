import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_OPERATION, OPERATION_PROGRESS_STATUS, SERVER_CREATE_PROGRESS_STEP } from '#src/app/operation-progress-contract.js'
import { getOperationProgressMessageKey } from '#src/electron/renderer/src/surfaces/message-box/operation-progress-presentation.js'

test('message-box presentation maps structured create-server progress to localization keys', () => {
  assert.equal(getOperationProgressMessageKey({
    operation: APP_OPERATION.CREATE_SERVER,
    step: SERVER_CREATE_PROGRESS_STEP.ROLLBACK,
    status: OPERATION_PROGRESS_STATUS.STARTED,
  }), 'operationProgress.createServer.rollback.started')
})

test('message-box presentation ignores unknown progress events', () => {
  assert.equal(getOperationProgressMessageKey({
    operation: 'unknown.operation',
    step: 'unknown.step',
    status: 'started',
  }), null)
})
