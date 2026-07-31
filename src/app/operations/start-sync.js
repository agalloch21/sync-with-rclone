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
} from '../app-errors.js'
import { resolveSyncContext } from '../services/sync-context-service.js'
import {
  OPERATION_HISTORY_STATUS,
  runOperationWithHistory,
} from './operation-history.js'
import { SYNC_PHASE_EVENT, SYNC_RESULT, SYNC_SESSION_EVENT, SYNC_SESSION_OPERATION } from './sync-operation-contract.js'

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

async function startSyncImpl(options, runtime = {}, cancelSignal = null, prepared = null) {
  assertRuntimeContract(runtime)

  const emit = runtime.events?.eventListener || (() => {})
  let runtimePaths = prepared?.runtimePaths || null

  let resolvedContext = prepared?.context || {
    mode: options.mode,
    localFolderPath: options.localFolderPath,
    remoteFolderPath: options.remoteFolderPath,
    extraIgnorePatterns: [],
  }

  try {
    emit({ type: SYNC_SESSION_EVENT.STARTED })

    if (prepared?.error)
      throw prepared.error

    const resolution = prepared || await resolveSyncContext(options)
    runtimePaths = resolution.runtimePaths
    resolvedContext = resolution.context

    if (resolution.resolvedTask && resolvedContext.mode === 'push') {
      await ensureRemoteFolder(
        resolvedContext.remoteFolderPath,
        runtimePaths,
        cancelSignal,
      )
    }

    emit({
      type: SYNC_SESSION_EVENT.CONTEXT_RESOLVED,
      context: resolvedContext,
    })
  }
  catch (error) {
    const applicationError = toApplicationError(error)
    const sessionResult = enrichFailedSessionResult({
      result: SYNC_RESULT.FAILED,
      message: applicationError?.message || String(applicationError),
      context: resolvedContext,
      error: applicationError,
    }, applicationError, runtimePaths)
    emit({ type: SYNC_SESSION_EVENT.RESULT, ...sessionResult })

    return sessionResult
  }

  const resolvedOptions = {
    ...resolvedContext,
    runtimePaths,
  }

  function phaseEventToSessionEvent(event) {
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

  let executionResult = null
  try {
    executionResult = await executeSync(resolvedOptions, {
      events: { eventListener: phaseEventToSessionEvent },
      interactions: { reviewDiff: runtime.interactions?.reviewDiff },
    }, cancelSignal)
  }
  catch (error) {
    const applicationError = toApplicationError(error)
    const sessionResult = enrichFailedSessionResult({
      result: SYNC_RESULT.FAILED,
      message: applicationError?.message || String(applicationError),
      context: resolvedContext,
      error: applicationError,
    }, applicationError, runtimePaths)
    emit({ type: SYNC_SESSION_EVENT.RESULT, ...sessionResult })

    return sessionResult
  }

  const sessionResult = {
    context: resolvedContext,
    ...executionResult,
  }
  if (sessionResult.result === SYNC_RESULT.FAILED) {
    sessionResult.error = toApplicationError(sessionResult.error)
    sessionResult.message = sessionResult.error?.message || sessionResult.message
    enrichFailedSessionResult(sessionResult, sessionResult.error, runtimePaths)
  }

  emit({ type: SYNC_SESSION_EVENT.RESULT, ...sessionResult })

  return sessionResult
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

export async function startSync(options, runtime = {}, cancelSignal = null, prepared = null) {
  let resolution = prepared
  if (!resolution) {
    const runtimePaths = getRuntimePaths()
    try {
      resolution = await resolveSyncContext(options, runtimePaths)
    }
    catch (error) {
      resolution = { error, runtimePaths }
    }
  }

  return await runOperationWithHistory({
    operation: getSyncOperation(options?.mode),
    subject: getSyncSubject(options, resolution?.context),
    resolveResult: resolveSyncHistoryResult,
  }, () => startSyncImpl(options, runtime, cancelSignal, resolution))
}
