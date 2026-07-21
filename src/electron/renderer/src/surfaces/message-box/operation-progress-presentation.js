import { APP_OPERATION, OPERATION_PROGRESS_STATUS, SERVER_CREATE_PROGRESS_STEP } from '#src/app/operation-progress-contract.js'

const CREATE_SERVER_MESSAGE_KEYS = Object.freeze({
  [SERVER_CREATE_PROGRESS_STEP.SAVE]: {
    [OPERATION_PROGRESS_STATUS.STARTED]: 'operationProgress.createServer.save.started',
    [OPERATION_PROGRESS_STATUS.SUCCEEDED]: 'operationProgress.createServer.save.succeeded',
    [OPERATION_PROGRESS_STATUS.FAILED]: 'operationProgress.createServer.save.failed',
  },
  [SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION]: {
    [OPERATION_PROGRESS_STATUS.STARTED]: 'operationProgress.createServer.testConnection.started',
    [OPERATION_PROGRESS_STATUS.SUCCEEDED]: 'operationProgress.createServer.testConnection.succeeded',
    [OPERATION_PROGRESS_STATUS.FAILED]: 'operationProgress.createServer.testConnection.failed',
  },
  [SERVER_CREATE_PROGRESS_STEP.ROLLBACK]: {
    [OPERATION_PROGRESS_STATUS.STARTED]: 'operationProgress.createServer.rollback.started',
    [OPERATION_PROGRESS_STATUS.SUCCEEDED]: 'operationProgress.createServer.rollback.succeeded',
    [OPERATION_PROGRESS_STATUS.FAILED]: 'operationProgress.createServer.rollback.failed',
  },
})

export function getOperationProgressMessageKey(event) {
  if (event?.operation !== APP_OPERATION.CREATE_SERVER)
    return null

  return CREATE_SERVER_MESSAGE_KEYS[event.step]?.[event.status] || null
}
