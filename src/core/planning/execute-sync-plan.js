import {
  cleanupEmptyDirectories,
  copyFiles,
  deleteFiles,
} from '#src/infrastructure/rclone/remote-files.js'
import {
  SYNC_OPERATION_STATUS,
} from '../contract.js'
import { markPullSymbolicLinkFailures } from './pull-symbolic-link-failures.js'
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

function splitDeleteOperationsByCopyBoundary(operations) {
  const firstCopyIndex = operations.findIndex(operation => operation.type === 'copy')
  if (firstCopyIndex === -1) {
    return {
      preCopyDeleteOperations: [],
      postCopyDeleteOperations: getOperationsByType(operations, 'delete'),
    }
  }

  return {
    preCopyDeleteOperations: operations
      .slice(0, firstCopyIndex)
      .filter(operation => operation.type === 'delete'),
    postCopyDeleteOperations: operations
      .slice(firstCopyIndex)
      .filter(operation => operation.type === 'delete'),
  }
}

function isOperationPending(operation) {
  return operation.status === SYNC_OPERATION_STATUS.PENDING
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

/**
 * Applies a confirmed mirror plan in failure-safe dependency order:
 * 1. delete file/directory shape conflicts and remove empty directories;
 * 2. copy every selected added or modified file;
 * 3. delete the remaining destination-only files and clean up again.
 *
 * Ordinary deletes deliberately happen after copy. If copying fails, target
 * extras that did not block the copy are therefore left intact.
 */
export async function executeSyncPlan(syncPlan, context, onProgress = null, cancelSignal = null) {
  if (!syncPlan || syncPlan.action !== 'confirm') {
    return {
      action: 'cancel',
      operations: [],
    }
  }

  const operations = createSyncOperations(syncPlan)
  const copyOperations = getOperationsByType(operations, 'copy')
  const {
    preCopyDeleteOperations,
    postCopyDeleteOperations,
  } = splitDeleteOperationsByCopyBoundary(operations)
  const { sourceRoot, destinationRoot } = getApplyRoots(
    context.mode,
    context.localFolderPath,
    context.remoteFolderPath,
  )
  const activities = {
    START: 'start',
    RESOLVE_CONFLICTS: 'resolve-conflicts',
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

    await markPullSymbolicLinkFailures(
      context,
      operations,
      preCopyDeleteOperations,
      copyOperations,
      cancelSignal,
    )

    const executableCopyOperations = copyOperations.filter(isOperationPending)
    const executablePreCopyDeleteOperations = preCopyDeleteOperations.filter(isOperationPending)
    const executablePostCopyDeleteOperations = postCopyDeleteOperations.filter(isOperationPending)

    if (executableCopyOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitProgress(activities.RESOLVE_CONFLICTS)

      if (executablePreCopyDeleteOperations.length > 0) {
        try {
          const confirmedFiles = await deleteFiles(
            destinationRoot,
            executablePreCopyDeleteOperations.map(operation => operation.path),
            context.runtimePaths,
            cancelSignal,
          )
          markOperationsSynced(executablePreCopyDeleteOperations, confirmedFiles)
        }
        catch (error) {
          markOperationsSynced(executablePreCopyDeleteOperations, error?.confirmedFiles || [])
          throw error
        }
      }

      await cleanupEmptyDirectories(destinationRoot, context.runtimePaths, cancelSignal)

      cancelSignal?.throwIfAborted()
      emitProgress(activities.COPY)

      try {
        const confirmedFiles = await copyFiles(
          sourceRoot,
          destinationRoot,
          executableCopyOperations.map(operation => operation.path),
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
        markOperationsSynced(executableCopyOperations, confirmedFiles)
      }
      catch (error) {
        markOperationsSynced(executableCopyOperations, error?.confirmedFiles || [])
        throw error
      }
    }

    if (executablePostCopyDeleteOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitProgress(activities.DELETE)

      try {
        const confirmedFiles = await deleteFiles(
          destinationRoot,
          executablePostCopyDeleteOperations.map(operation => operation.path),
          context.runtimePaths,
          cancelSignal,
        )
        markOperationsSynced(executablePostCopyDeleteOperations, confirmedFiles)
      }
      catch (error) {
        markOperationsSynced(executablePostCopyDeleteOperations, error?.confirmedFiles || [])
        throw error
      }

      cancelSignal?.throwIfAborted()
      emitProgress(activities.CLEANUP)
      await cleanupEmptyDirectories(destinationRoot, context.runtimePaths, cancelSignal)
    }

    if (operations.some(operation => operation.status === SYNC_OPERATION_STATUS.FAILED))
      throw new Error('Some operations could not be applied.')
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
