import {
  cleanupEmptyDirectories,
  copyFiles,
  deleteFiles,
} from '#src/infrastructure/rclone/remote-files.js'
import {
  createSyncOperations,
  markOperationsSynced,
} from './sync-plan-result.js'

function getApplyRoots(mode, localFolderPath, remoteFolderPath) {
  if (mode === 'push') {
    return {
      sourceRoot: localFolderPath,
      destinationRoot: remoteFolderPath,
    }
  }

  return {
    sourceRoot: remoteFolderPath,
    destinationRoot: localFolderPath,
  }
}

function getOperationsByType(operations, type) {
  return operations.filter(operation => operation.type === type)
}

function attachExecutionSummary(error, operations, message = 'Apply failed') {
  const target = error && (typeof error === 'object' || typeof error === 'function')
    ? error
    : new Error(message)

  target.operations = operations

  if (target !== error)
    target.cause = error

  return target
}

export async function executeSyncPlan(syncPlan, context, onProgress = null, cancelSignal = null) {
  if (!syncPlan || syncPlan.action !== 'confirm') {
    return {
      action: 'cancel',
      operations: [],
    }
  }

  const operations = createSyncOperations(syncPlan)
  const copyOperations = getOperationsByType(operations, 'copy')
  const deleteOperations = getOperationsByType(operations, 'delete')
  const { sourceRoot, destinationRoot } = getApplyRoots(
    context.mode,
    context.localFolderPath,
    context.remoteFolderPath,
  )
  const activities = {
    START: 'start',
    COPY: 'copy',
    DELETE: 'delete',
    CLEANUP: 'cleanup',
    COMPLETE: 'complete',
  }
  function emitProgress(activity, measurement = null) {
    onProgress?.({
      activity,
      index: Object.values(activities).indexOf(activity),
      total: Object.values(activities).length,
      measurement,
    })
  }

  try {
    emitProgress(activities.START)

    if (copyOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitProgress(activities.COPY)

      try {
        const confirmedFiles = await copyFiles(
          sourceRoot,
          destinationRoot,
          copyOperations.map(operation => operation.path),
          context.runtimePaths,
          {
            cancelSignal,
            onTransferProgress(progress) {
              emitProgress(activities.COPY, {
                ...progress,
                unit: 'bytes',
              })
            },
          },
        )
        markOperationsSynced(copyOperations, confirmedFiles)
      }
      catch (error) {
        markOperationsSynced(copyOperations, error?.confirmedFiles || [])
        throw error
      }
    }

    if (deleteOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitProgress(activities.DELETE)

      try {
        const confirmedFiles = await deleteFiles(
          destinationRoot,
          deleteOperations.map(operation => operation.path),
          context.runtimePaths,
          cancelSignal,
        )
        markOperationsSynced(deleteOperations, confirmedFiles)
      }
      catch (error) {
        markOperationsSynced(deleteOperations, error?.confirmedFiles || [])
        throw error
      }

      cancelSignal?.throwIfAborted()
      emitProgress(activities.CLEANUP)
      await cleanupEmptyDirectories(destinationRoot, context.runtimePaths, cancelSignal)
    }
  }
  catch (error) {
    throw attachExecutionSummary(
      error,
      operations,
      cancelSignal?.aborted ? 'Apply cancelled' : 'Apply failed',
    )
  }

  emitProgress(activities.COMPLETE)

  return {
    action: 'confirm',
    operations,
  }
}
