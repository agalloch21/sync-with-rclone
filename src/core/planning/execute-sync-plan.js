import { assertLocalPathsDoNotCrossSymbolicLinks } from '#src/infrastructure/filesystem/local-files.js'
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

    if (context.mode === 'pull') {
      await assertLocalPathsDoNotCrossSymbolicLinks(
        destinationRoot,
        operations.map(operation => operation.path),
        cancelSignal,
      )
    }

    if (copyOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitProgress(activities.RESOLVE_CONFLICTS)

      if (preCopyDeleteOperations.length > 0) {
        try {
          const confirmedFiles = await deleteFiles(
            destinationRoot,
            preCopyDeleteOperations.map(operation => operation.path),
            context.runtimePaths,
            cancelSignal,
          )
          markOperationsSynced(preCopyDeleteOperations, confirmedFiles)
        }
        catch (error) {
          markOperationsSynced(preCopyDeleteOperations, error?.confirmedFiles || [])
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

    if (postCopyDeleteOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitProgress(activities.DELETE)

      try {
        const confirmedFiles = await deleteFiles(
          destinationRoot,
          postCopyDeleteOperations.map(operation => operation.path),
          context.runtimePaths,
          cancelSignal,
        )
        markOperationsSynced(postCopyDeleteOperations, confirmedFiles)
      }
      catch (error) {
        markOperationsSynced(postCopyDeleteOperations, error?.confirmedFiles || [])
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
