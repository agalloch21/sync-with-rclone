import { SYNC_OPERATION_STATUS } from '../contract.js'

export function createSyncOperations(syncPlan) {
  return (syncPlan?.operations || [])
    .filter(operation => operation.type === 'copy' || operation.type === 'delete')
    .map(operation => ({
      ...operation,
      status: SYNC_OPERATION_STATUS.PENDING,
    }))
}

export function markOperationsSynced(operations, confirmedPaths) {
  const confirmedPathSet = new Set(confirmedPaths)

  for (const operation of operations) {
    if (confirmedPathSet.has(operation.path))
      operation.status = SYNC_OPERATION_STATUS.SYNCED
  }

  return operations
}

export function markOperationFailed(operation, failure) {
  operation.status = SYNC_OPERATION_STATUS.FAILED
  operation.failure = failure
  return operation
}
