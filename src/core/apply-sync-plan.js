import {
  createRcloneCommand,
  runCommand as defaultRunCommand,
  parseConfirmedFilesFromOutput,
  parseTransferProgressFromOutput,
  withBatchFile,
} from './rclone-command.js'

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

function createApplyOperations(syncPlan) {
  return (syncPlan?.operations || [])
    .filter(operation => operation.type === 'copy' || operation.type === 'delete')
    .map(operation => ({
      ...operation,
      synced: false,
    }))
}

function getOperationsByType(operations, type) {
  return operations.filter(operation => operation.type === type)
}

function buildSyncedOperations(operations, confirmedFiles) {
  const confirmedPathSet = new Set(confirmedFiles)

  for (const operation of operations)
    operation.synced = confirmedPathSet.has(operation.path)

  return operations
}

function markOperationsSynced(operations) {
  for (const operation of operations)
    operation.synced = true

  return operations
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

function markConfirmedOperationsFromError(operations, operationType, error) {
  buildSyncedOperations(
    operations,
    parseConfirmedFilesFromOutput(`${error?.stdout || ''}\n${error?.stderr || ''}`, operationType),
  )
}

async function runCopyPhase({ sourceRoot, destinationRoot, operations }, runtimePaths, runCommand, cancelSignal, onTransferProgress) {
  const paths = operations.map(operation => operation.path)
  return withBatchFile(paths, async (batchFilePath) => {
    const { command, args } = createRcloneCommand(runtimePaths, [
      'copy',
      sourceRoot,
      destinationRoot,
      '--metadata',
      '--refresh-times',
      '--files-from',
      batchFilePath,
      '--use-json-log',
      '--log-level',
      'INFO',
      '--progress',
      '--stats',
      '500ms',
      '--stats-unit',
      'bytes',
    ])

    try {
      await runCommand(command, args, {
        cancelSignal,
        onOutput: output => onTransferProgress?.(parseTransferProgressFromOutput(output)),
      })
      return markOperationsSynced(operations)
    }
    catch (error) {
      markConfirmedOperationsFromError(operations, 'copy', error)
      throw error
    }
  })
}

async function runDeletePhase({ root, operations }, runtimePaths, runCommand, cancelSignal) {
  const paths = operations.map(operation => operation.path)
  return withBatchFile(paths, async (batchFilePath) => {
    const { command, args } = createRcloneCommand(runtimePaths, [
      'delete',
      root,
      '--files-from',
      batchFilePath,
      '--rmdirs',
      '--use-json-log',
      '--log-level',
      'INFO',
    ])

    try {
      await runCommand(command, args, { cancelSignal })
      return markOperationsSynced(operations)
    }
    catch (error) {
      markConfirmedOperationsFromError(operations, 'delete', error)
      throw error
    }
  })
}

async function runCleanupEmptyDirs(root, runtimePaths, runCommand, cancelSignal) {
  const { command, args } = createRcloneCommand(runtimePaths, [
    'rmdirs',
    root,
    '--leave-root',
    '--use-json-log',
    '--log-level',
    'INFO',
  ])
  await runCommand(command, args, { cancelSignal })
}

export async function applySyncPlan(syncPlan, context, runtime, cancelSignal) {
  if (!syncPlan || syncPlan.action !== 'confirm') {
    return {
      action: 'cancel',
      operations: [],
    }
  }

  const operations = createApplyOperations(syncPlan)
  const copyOperations = getOperationsByType(operations, 'copy')
  const deleteOperations = getOperationsByType(operations, 'delete')
  const { sourceRoot, destinationRoot } = getApplyRoots(
    context.mode,
    context.localFolderPath,
    context.remoteFolderPath,
  )
  const APPLY_ACTIVITIES = {
    START: 'start',
    COPY: 'copy',
    DELETE: 'delete',
    CLEANUP: 'cleanup',
    COMPLETE: 'complete',
  }
  const executionSteps = [
    copyOperations.length > 0 ? APPLY_ACTIVITIES.COPY : null,
    deleteOperations.length > 0 ? APPLY_ACTIVITIES.DELETE : null,
    deleteOperations.length > 0 ? APPLY_ACTIVITIES.CLEANUP : null,
  ].filter(Boolean)

  const runCommand = runtime?.dependents?.runCommand || defaultRunCommand

  function emitCopyProgress(progress) {
    if (!progress)
      return
    const measurement = {
      ...progress,
      unit: 'bytes',
    }
    emitPhaseProgress(APPLY_ACTIVITIES.COPY, measurement)
  }

  function emitPhaseProgress(activity, measurement = null) {
    runtime?.events?.progress?.({
      activity,
      index: Object.values(APPLY_ACTIVITIES).indexOf(activity),
      total: Object.values(APPLY_ACTIVITIES).length,
      measurement,
    })
  }

  try {
    emitPhaseProgress(APPLY_ACTIVITIES.START)

    if (copyOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitPhaseProgress(APPLY_ACTIVITIES.COPY)

      await runCopyPhase({
        sourceRoot,
        destinationRoot,
        operations: copyOperations,
      }, context.runtimePaths, runCommand, cancelSignal, emitCopyProgress)
    }

    if (deleteOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      emitPhaseProgress(APPLY_ACTIVITIES.DELETE)
      await runDeletePhase({
        root: destinationRoot,
        operations: deleteOperations,
      }, context.runtimePaths, runCommand, cancelSignal)

      cancelSignal?.throwIfAborted()
      emitPhaseProgress(APPLY_ACTIVITIES.CLEANUP)
      await runCleanupEmptyDirs(destinationRoot, context.runtimePaths, runCommand, cancelSignal)
    }
  }
  catch (error) {
    throw attachExecutionSummary(
      error,
      operations,
      cancelSignal?.aborted ? 'Apply cancelled' : 'Apply failed',
    )
  }

  emitPhaseProgress(APPLY_ACTIVITIES.COMPLETE)

  // await new Promise(resolve => setTimeout(resolve, 500000))

  return {
    action: 'confirm',
    operations,
  }
}
