import { PHASE_EVENT, SYNC_RESULT } from '#src/core/contract.js'
import { syncCore } from '#src/core/sync-engine.js'
import { getErrorCode, getErrorDetails } from './app-errors.js'
import { ensureRemoteFolderExists } from './ensure-remote-folder.js'
import { loadConfig } from './load-config.js'
import { resolveLocalDirectoryPath } from './path-utils.js'
import { resolveSyncTask } from './resolve-sync-task.js'
import { getRuntimePaths } from './runtime-paths.js'
import { SESSION_EVENT } from './sync-session-contract.js'

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

  if (dependents.createBatchFile && typeof dependents.createBatchFile !== 'function')
    throw new TypeError('startSync runtime.dependents.createBatchFile must be a function')

  if (dependents.removeBatchFile && typeof dependents.removeBatchFile !== 'function')
    throw new TypeError('startSync runtime.dependents.removeBatchFile must be a function')
}

export async function startSync(options, runtime = {}, cancelSignal = null) {
  assertRuntimeContract(runtime)

  const emit = runtime.events?.eventListener || (() => {})

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

    const runtimePaths = getRuntimePaths()
    const config = bypassConfig ? null : await loadConfig(runtimePaths.configPath)

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

    const resolvedOptions = {
      ...resolvedContext,
      runtimePaths,
    }

    function coreEventToSessionEvent(event) {
      if (event.type === PHASE_EVENT.FAILED || event.type === PHASE_EVENT.CANCELLED || event.type === PHASE_EVENT.DONE)
        return

      emit({
        type: SESSION_EVENT.PROGRESS,
        phase: event.phase,
        message: event.message,
        progress: (event.current !== undefined && event.total !== undefined) ? { current: event.current, total: event.total } : null,
      })
    }

    // Core Function
    const coreResult = await syncCore(resolvedOptions, {
      events: { eventListener: coreEventToSessionEvent },
      interactions: { reviewDiff: runtime.interactions?.reviewDiff },
      dependents: runtime.dependents,
    }, cancelSignal)

    const sessionResult = {
      context: resolvedContext,
      ...coreResult,
    }
    if (sessionResult.result === SYNC_RESULT.FAILED) {
      sessionResult.errorCode = getErrorCode(sessionResult.error)
      sessionResult.errorDetails = getErrorDetails(sessionResult.error)
    }

    emit({ type: SESSION_EVENT.RESULT, ...sessionResult })

    return sessionResult
  }
  catch (error) {
    const sessionResult = {
      result: SYNC_RESULT.FAILED,
      message: error?.message || String(error),
      errorCode: getErrorCode(error),
      errorDetails: getErrorDetails(error),
      context: resolvedContext,
      error,
    }
    emit({ type: SESSION_EVENT.RESULT, ...sessionResult })

    return sessionResult
  }
}
