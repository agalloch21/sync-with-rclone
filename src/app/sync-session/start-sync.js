import fs from 'node:fs'
import path from 'node:path'
import { PHASE_EVENT, SYNC_RESULT } from '#src/core/contract.js'
import { syncCore } from '#src/core/sync-engine.js'
import { getErrorCode, getErrorDetail } from '../app-errors.js'
import { loadAppConfig } from '../configuration/app-config.js'
import {
  OPERATION_HISTORY_STATUS,
  runOperationWithHistory,
} from '../operations/operation-history.js'
import { resolveLocalDirectoryPath } from '../path-utils.js'
import { getRuntimePaths } from '../runtime-paths.js'
import { SESSION_EVENT, SYNC_SESSION_OPERATION } from './contract.js'
import { ensureRemoteFolderExists } from './ensure-remote-folder.js'
import { resolveSyncTask } from './resolve-sync-task.js'

function assertRuntimeContract(runtime) {
  if (!runtime || typeof runtime !== 'object')
    throw new TypeError('startSync runtime must be an object')

  const eventListener = runtime.events?.eventListener
  if (eventListener && typeof eventListener !== 'function')
    throw new TypeError('startSync runtime.events.eventListener must be a function')

  const reviewDiff = runtime.interactions?.reviewDiff
  if (reviewDiff && typeof reviewDiff !== 'function')
    throw new TypeError('startSync runtime.interactions.reviewDiff must be a function')

  const dependents = runtime.dependents || {}
  if (dependents.runCommand && typeof dependents.runCommand !== 'function')
    throw new TypeError('startSync runtime.dependents.runCommand must be a function')
}

function enrichFailedSessionResult(sessionResult, error, runtimePaths) {
  sessionResult.errorCode = getErrorCode(error)
  sessionResult.errorDetails = getErrorDetail(error)

  if (runtimePaths?.logDirectory) {
    const logPath = path.posix.join(runtimePaths.logDirectory, 'quick-actions.log')
    if (fs.existsSync(logPath))
      sessionResult.logPath = logPath
  }

  return sessionResult
}

async function startSyncImpl(options, runtime = {}, cancelSignal = null) {
  assertRuntimeContract(runtime)

  const emit = runtime.events?.eventListener || (() => {})
  let runtimePaths = null

  const resolvedContext = {
    mode: options.mode,
    localFolderPath: options.localFolderPath,
    remoteFolderPath: options.remoteFolderPath,
    extraIgnorePatterns: [],
  }

  try {
    emit({ type: SESSION_EVENT.STARTED })

    const { bypassConfig = false } = options
    if (bypassConfig && !options.remoteFolderPath) {
      throw new Error('remoteFolderPath is required when bypassConfig is enabled')
    }

    runtimePaths = getRuntimePaths()
    const config = bypassConfig ? null : await loadAppConfig(runtimePaths.configPath)

    const resolvedTask = bypassConfig ? null : resolveSyncTask(config, options.localFolderPath, options.remoteFolderPath)
    resolvedContext.localFolderPath = resolvedTask ? resolvedTask.localFolderPath : resolveLocalDirectoryPath(options.localFolderPath)
    resolvedContext.remoteFolderPath = resolvedTask ? resolvedTask.remoteFolderPath : options.remoteFolderPath
    resolvedContext.extraIgnorePatterns = resolvedTask ? resolvedTask.extraIgnorePatterns : []

    if (resolvedTask && resolvedContext.mode === 'push') {
      await ensureRemoteFolderExists(
        resolvedContext.remoteFolderPath,
        runtimePaths,
        runtime,
        cancelSignal,
      )
    }

    emit({
      type: SESSION_EVENT.CONTEXT_RESOLVED,
      context: resolvedContext,
    })
  }
  catch (error) {
    const sessionResult = enrichFailedSessionResult({
      result: SYNC_RESULT.FAILED,
      message: error?.message || String(error),
      context: resolvedContext,
      error,
    }, error, runtimePaths)
    emit({ type: SESSION_EVENT.RESULT, ...sessionResult })

    return sessionResult
  }

  const resolvedOptions = {
    ...resolvedContext,
    runtimePaths,
  }

  function coreEventToSessionEvent(event) {
    if (event.type === PHASE_EVENT.FAILED || event.type === PHASE_EVENT.CANCELLED || event.type === PHASE_EVENT.DONE)
      return

    // only transfer SESSION_EVENT.PROGRESS event
    emit({
      type: SESSION_EVENT.PROGRESS,
      phase: event.phase,
      message: event.message,
      progress: event.progress,
    })
  }

  let coreResult = null
  try {
    coreResult = await syncCore(resolvedOptions, {
      events: { eventListener: coreEventToSessionEvent },
      interactions: { reviewDiff: runtime.interactions?.reviewDiff },
      dependents: runtime.dependents,
    }, cancelSignal)
  }
  catch (error) {
    const sessionResult = enrichFailedSessionResult({
      result: SYNC_RESULT.FAILED,
      message: error?.message || String(error),
      context: resolvedContext,
      error,
    }, error, runtimePaths)
    emit({ type: SESSION_EVENT.RESULT, ...sessionResult })

    return sessionResult
  }

  const sessionResult = {
    context: resolvedContext,
    ...coreResult,
  }
  if (sessionResult.result === SYNC_RESULT.FAILED)
    enrichFailedSessionResult(sessionResult, sessionResult.error, runtimePaths)

  emit({ type: SESSION_EVENT.RESULT, ...sessionResult })

  return sessionResult
}

function getSyncOperation(mode) {
  if (mode === 'push')
    return SYNC_SESSION_OPERATION.PUSH
  if (mode === 'pull')
    return SYNC_SESSION_OPERATION.PULL
  return SYNC_SESSION_OPERATION.UNKNOWN
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

export async function startSync(options, runtime = {}, cancelSignal = null) {
  return await runOperationWithHistory({
    operation: getSyncOperation(options?.mode),
    subject: {
      type: 'sync',
      mode: typeof options?.mode === 'string' ? options.mode : '',
      localFolderPath: typeof options?.localFolderPath === 'string' ? options.localFolderPath : '',
      ...(typeof options?.remoteFolderPath === 'string' && {
        remoteFolderPath: options.remoteFolderPath,
      }),
    },
    resolveResult: resolveSyncHistoryResult,
  }, () => startSyncImpl(options, runtime, cancelSignal))
}
