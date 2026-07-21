import { AsyncLocalStorage } from 'node:async_hooks'

export { APP_OPERATION, OPERATION_PROGRESS_STATUS, SERVER_CREATE_PROGRESS_STEP } from './operation-progress-contract.js'

const operationProgressStorage = new AsyncLocalStorage()

export function runWithOperationProgress(context, callback) {
  if (!context || typeof context !== 'object')
    throw new TypeError('Operation progress context must be an object.')
  if (typeof context.operationId !== 'string' || context.operationId.trim().length === 0)
    throw new TypeError('Operation progress context requires an operationId.')
  if (typeof context.operation !== 'string' || context.operation.trim().length === 0)
    throw new TypeError('Operation progress context requires an operation type.')
  if (typeof context.publish !== 'function')
    throw new TypeError('Operation progress context requires a publish function.')
  if (typeof callback !== 'function')
    throw new TypeError('Operation progress callback must be a function.')

  return operationProgressStorage.run({
    operationId: context.operationId,
    operation: context.operation,
    publish: context.publish,
  }, callback)
}

export function reportOperationProgress(event) {
  const context = operationProgressStorage.getStore()
  if (!context)
    return

  context.publish({
    operationId: context.operationId,
    operation: context.operation,
    step: event?.step,
    status: event?.status,
  })
}
