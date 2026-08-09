import fs from 'node:fs'
import path from 'node:path'
import { executeSync } from '#src/core/execute-sync.js'
import { ensureRemoteFolder } from '#src/infrastructure/rclone/remote-files.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import {
  APP_ERROR_CODE,
  getErrorCode,
  getErrorDetail,
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

function enrichFailedSessionResult(sessionResult, error, runtimePaths) {
  sessionResult.errorCode = getErrorCode(error)
  sessionResult.errorDetails = getErrorDetail(error)

  if (runtimePaths?.logDirectory) {
    const logPath = path.join(runtimePaths.logDirectory, 'quick-actions.log')
    if (fs.existsSync(logPath))
      sessionResult.logPath = logPath
  }

  return sessionResult
}

function toApplicationError(error) {
  return toAppError(
    error,
    APP_ERROR_CODE.SYNC_EXECUTION_FAILED,
    'Synchronization failed.',
  )
}

function createFailedSessionResult(error, context, runtimePaths) {
  const applicationError = toApplicationError(error)
  return enrichFailedSessionResult({
    result: SYNC_RESULT.FAILED,
    message: applicationError?.message || String(applicationError),
    context,
    error: applicationError,
  }, applicationError, runtimePaths)
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

function createCancelledSessionResult(context, phase = null) {
  return {
    result: SYNC_RESULT.CANCELLED,
    reason: SYNC_CANCEL_REASON.ABORT_SIGNAL,
    phase,
    context,
    operations: [],
  }
}

function emitSessionResult(sessionResult, emit) {
  emit({ type: SYNC_SESSION_EVENT.RESULT, ...sessionResult })
  return sessionResult
}

function emitErrorSessionResult(error, context, runtimePaths, emit, cancelSignal) {
  const sessionResult = cancelSignal?.aborted
    ? createCancelledSessionResult(context)
    : createFailedSessionResult(error, context, runtimePaths)

  return emitSessionResult(sessionResult, emit)
}

async function releaseAdmissionWithoutChangingResult(admission, runtimePaths) {
  try {
    await releaseSyncAdmission(admission, runtimePaths)
  }
  catch (error) {
    console.warn(`Failed to release sync admission: ${error?.message || String(error)}`)
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
        code: result?.errorCode,
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

export async function startSync(options, runtime = {}, cancelSignal = null) {
  assertRuntimeContract(runtime)

  const emit = runtime.events?.eventListener || (() => {})
  const runtimePaths = getRuntimePaths()
  const completeError = (error, context) =>
    emitErrorSessionResult(error, context, runtimePaths, emit, cancelSignal)
  const unresolvedContext = {
    mode: options.mode,
    localFolderPath: options.localFolderPath,
    remoteFolderPath: options.remoteFolderPath,
    extraIgnorePatterns: [],
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

      const sessionResult = {
        context,
        ...executionResult,
      }
      if (sessionResult.result === SYNC_RESULT.FAILED) {
        sessionResult.error = toApplicationError(sessionResult.error)
        sessionResult.message = sessionResult.error?.message || sessionResult.message
        enrichFailedSessionResult(sessionResult, sessionResult.error, runtimePaths)
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
      await releaseAdmissionWithoutChangingResult(admission, runtimePaths)
    }
  })
}
