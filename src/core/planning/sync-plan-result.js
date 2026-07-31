export function createSyncOperations(syncPlan) {
  return (syncPlan?.operations || [])
    .filter(operation => operation.type === 'copy' || operation.type === 'delete')
    .map(operation => ({
      ...operation,
      synced: false,
    }))
}

export function markOperationsSynced(operations, confirmedPaths) {
  const confirmedPathSet = new Set(confirmedPaths)

  for (const operation of operations)
    operation.synced = confirmedPathSet.has(operation.path)

  return operations
}
