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
  const executionSteps = [
    copyOperations.length > 0 ? 'copy' : null,
    deleteOperations.length > 0 ? 'delete' : null,
  ].filter(Boolean)

  const runCommand = runtime?.dependents?.runCommand || defaultRunCommand

  function emitTransferProgress(progress) {
    if (!progress)
      return

    runtime?.events?.progress?.({
      transfer: {
        ...progress,
        unit: 'bytes',
        message: 'copy',
      },
    })
  }

  function emitPhaseProgress(current, message) {
    runtime?.events?.progress?.({
      phase: {
        current,
        total: executionSteps.length + 1,
        message,
      },
    })
  }

  emitPhaseProgress(0, 'start')

  try {
    let currentStep = 0

    if (copyOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      currentStep += 1
      emitPhaseProgress(currentStep, 'copy')
      await runCopyPhase({
        sourceRoot,
        destinationRoot,
        operations: copyOperations,
      }, context.runtimePaths, runCommand, cancelSignal, emitTransferProgress)
    }

    if (deleteOperations.length > 0) {
      cancelSignal?.throwIfAborted()
      currentStep += 1
      emitPhaseProgress(currentStep, 'delete')
      await runDeletePhase({
        root: destinationRoot,
        operations: deleteOperations,
      }, context.runtimePaths, runCommand, cancelSignal)

      cancelSignal?.throwIfAborted()
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

  emitPhaseProgress(executionSteps.length + 1, 'complete')

  return {
    action: 'confirm',
    operations,
  }
}
