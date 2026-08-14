import { executeSync } from '#src/core/execute-sync.js'
import { INFRASTRUCTURE_ERROR_CODE } from '#src/infrastructure/infrastructure-error.js'
import { ensureRemoteFolder } from '#src/infrastructure/rclone/remote-files.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import {
  APP_ERROR_CODE,
  toAppError,
} from '../../app-errors.js'
import { notifyConfigUpdate } from '../../app-events.js'
import { SYNC_CANCEL_REASON, SYNC_PHASE_EVENT, SYNC_RESULT, SYNC_SESSION_EVENT, SYNC_SESSION_OPERATION } from '../../contracts/sync.js'
import { updateMapping } from '../../services/mapping.js'
import {
  OPERATION_HISTORY_STATUS,
  runOperationWithHistory,
} from '../operation-history.js'
import { acquireSyncAdmission, releaseSyncAdmission } from './admission.js'
import { createSyncDiagnostics } from './diagnostics.js'
import { resolveSyncContext } from './resolve-context.js'

function assertRuntimeContract(runtime) {
  if (!runtime || typeof runtime !== 'object')
    throw new TypeError('startSync runtime must be an object')

  const eventListener = runtime.events?.eventListener
  if (eventListener && typeof eventListener !== 'function')
    throw new TypeError('startSync runtime.events.eventListener must be a function')

  const reviewDiff = runtime.interactions?.reviewDiff
  if (reviewDiff && typeof reviewDiff !== 'function')
    throw new TypeError('startSync runtime.interactions.reviewDiff must be a function')
}

function toApplicationError(error, context = null) {
  if (error?.code === INFRASTRUCTURE_ERROR_CODE.PATH_SYMBOLIC_LINK_CONFLICT) {
    return toAppError(
      error,
      APP_ERROR_CODE.SYNC_LOCAL_SYMBOLIC_LINK_CONFLICT,
      'Pull cannot write through an internal symbolic link.',
    )
  }

  if (context?.mode === 'pull' && error?.code === INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_NOT_FOUND) {
    return toAppError(
      error,
      APP_ERROR_CODE.SYNC_REMOTE_SOURCE_NOT_FOUND,
      'The remote source folder does not exist.',
      {
        meta: { remoteFolderPath: context.remoteFolderPath },
      },
    )
  }

  return toAppError(
    error,
    APP_ERROR_CODE.SYNC_EXECUTION_FAILED,
    'Synchronization failed.',
  )
}

function createFailedSessionResult(error, context) {
  const applicationError = toApplicationError(error, context)
  return {
    result: SYNC_RESULT.FAILED,
    error: applicationError,
  }
}

function createPhaseEventListener(emit) {
  return function phaseEventToSessionEvent(event) {
    if (event.type === SYNC_PHASE_EVENT.FAILED || event.type === SYNC_PHASE_EVENT.CANCELLED || event.type === SYNC_PHASE_EVENT.DONE)
      return

    // only transfer SYNC_SESSION_EVENT.PROGRESS event
    emit({
      type: SYNC_SESSION_EVENT.PROGRESS,
      phase: event.phase,
      message: event.message,
      progress: event.progress,
    })
  }
}

function createCancelledSessionResult() {
  return {
    result: SYNC_RESULT.CANCELLED,
    reason: SYNC_CANCEL_REASON.ABORT_SIGNAL,
    operations: [],
  }
}

function emitSessionResult(sessionResult, emit) {
  emit({ type: SYNC_SESSION_EVENT.RESULT, ...sessionResult })
  return sessionResult
}

function emitErrorSessionResult(error, context, emit, cancelSignal) {
  const sessionResult = cancelSignal?.aborted
    ? createCancelledSessionResult()
    : createFailedSessionResult(error, context)

  return emitSessionResult(sessionResult, emit)
}

async function releaseAdmissionWithoutChangingResult(admission, runtimePaths, diagnostics) {
  try {
    await releaseSyncAdmission(admission, runtimePaths)
  }
  catch (error) {
    console.warn(`Failed to release sync admission: ${error?.message || String(error)}`)
    await diagnostics.warning('sync-admission', error)
  }
}

function getSyncOperation(mode) {
  if (mode === 'push')
    return SYNC_SESSION_OPERATION.PUSH
  if (mode === 'pull')
    return SYNC_SESSION_OPERATION.PULL
  return SYNC_SESSION_OPERATION.UNKNOWN
}

function getSyncSubject(options, context = null) {
  return {
    type: 'sync',
    mode: typeof options?.mode === 'string' ? options.mode : '',
    localFolderPath: typeof context?.localFolderPath === 'string'
      ? context.localFolderPath
      : typeof options?.localFolderPath === 'string' ? options.localFolderPath : '',
    ...((typeof context?.remoteFolderPath === 'string' || typeof options?.remoteFolderPath === 'string') && {
      remoteFolderPath: typeof context?.remoteFolderPath === 'string'
        ? context.remoteFolderPath
        : options.remoteFolderPath,
    }),
  }
}

function resolveSyncHistoryResult(result) {
  if (result?.result === SYNC_RESULT.CANCELLED) {
    return {
      status: OPERATION_HISTORY_STATUS.CANCELLED,
    }
  }

  if (result?.result === SYNC_RESULT.FAILED) {
    return {
      status: OPERATION_HISTORY_STATUS.FAILED,
      error: result?.error || {
        code: APP_ERROR_CODE.UNKNOWN,
        message: result?.message,
      },
    }
  }

  return {
    status: OPERATION_HISTORY_STATUS.SUCCEEDED,
  }
}

async function recordCompletedSync(resolvedMapping, mode) {
  if (!resolvedMapping)
    return

  const mapping = resolvedMapping.matchedMapping
  await updateMapping(mapping, {
    lastSyncMode: mode,
    lastSyncFolder: resolvedMapping.relativePath,
    lastSyncDate: new Date().toISOString(),
  })
  notifyConfigUpdate()
}

async function runSync(options, runtime, cancelSignal, runtimePaths, diagnostics) {
  const emit = runtime.events?.eventListener || (() => {})
  const completeError = (error, context) =>
    emitErrorSessionResult(error, context, emit, cancelSignal)
  const unresolvedContext = {
    mode: options.mode,
    localFolderPath: options.localFolderPath,
    remoteFolderPath: options.remoteFolderPath,
    syncFilterPatterns: [],
  }

  let resolution
  try {
    resolution = await resolveSyncContext(options, runtimePaths)
  }
  catch (error) {
    const historyDefinition = {
      operation: getSyncOperation(options?.mode),
      subject: getSyncSubject(options),
      resolveResult: resolveSyncHistoryResult,
    }

    return await runOperationWithHistory(historyDefinition, () => {
      emit({ type: SYNC_SESSION_EVENT.STARTED })
      return completeError(error, unresolvedContext)
    })
  }

  const { context, resolvedMapping } = resolution
  const historyDefinition = {
    operation: getSyncOperation(options?.mode),
    subject: getSyncSubject(options, context),
    resolveResult: resolveSyncHistoryResult,
  }

  let admission
  try {
    admission = await acquireSyncAdmission(context, runtimePaths)
  }
  catch (error) {
    return completeError(error, context)
  }

  return await runOperationWithHistory(historyDefinition, async () => {
    try {
      emit({ type: SYNC_SESSION_EVENT.STARTED })

      if (resolvedMapping && context.mode === 'push') {
        await ensureRemoteFolder(
          context.remoteFolderPath,
          runtimePaths,
          cancelSignal,
        )
      }

      emit({
        type: SYNC_SESSION_EVENT.CONTEXT_RESOLVED,
        context,
      })

      const executionResult = await executeSync({
        ...context,
        runtimePaths,
      }, {
        events: { eventListener: createPhaseEventListener(emit) },
        interactions: { reviewDiff: runtime.interactions?.reviewDiff },
      }, cancelSignal)

      const sessionResult = { ...executionResult }
      if (sessionResult.result === SYNC_RESULT.FAILED) {
        sessionResult.error = toApplicationError(sessionResult.error, context)
      }
      else if (sessionResult.result === SYNC_RESULT.COMPLETED) {
        await recordCompletedSync(resolvedMapping, context.mode)
      }
      return emitSessionResult(sessionResult, emit)
    }
    catch (error) {
      return completeError(error, context)
    }
    finally {
      await releaseAdmissionWithoutChangingResult(admission, runtimePaths, diagnostics)
    }
  })
}

export async function startSync(options, runtime = {}, cancelSignal = null) {
  assertRuntimeContract(runtime)

  const runtimePaths = getRuntimePaths()
  const diagnostics = createSyncDiagnostics(runtimePaths)

  try {
    const sessionResult = await runSync(options, runtime, cancelSignal, runtimePaths, diagnostics)
    await diagnostics.result(sessionResult)
    return sessionResult
  }
  catch (error) {
    await diagnostics.unexpected(error)
    throw error
  }
}
