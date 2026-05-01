import { syncCore } from '#src/core/sync-engine.js'
import { loadConfig } from './load-config.js'
import { resolveLocalDirectoryPath } from './path-utils.js'
import { resolveSyncTask } from './resolve-sync-task.js'
import { getRuntimePaths } from './runtime-paths.js'

export async function startSync(options, runtime = {}, cancelSignal = null) {
  const emit = runtime.events?.eventListener || (() => {})
  try {
    emit({ type: 'session.started' })

    const { bypassConfig = false } = options
    const runtimePaths = getRuntimePaths()
    const config = bypassConfig ? null : await loadConfig(runtimePaths.configPath)
    const localFolderPath = resolveLocalDirectoryPath(options.localFolderPath)
    const resolvedTask = bypassConfig ? null : resolveSyncTask(config, localFolderPath, options.remoteFolderPath)

    if (bypassConfig && !options.remoteFolderPath) {
      throw new Error('remoteFolderPath is required when bypassConfig is enabled')
    }

    const resolvedContext = {
      mode: options.mode,
      localFolderPath,
      remoteFolderPath: resolvedTask ? resolvedTask.remoteFolderPath : options.remoteFolderPath,
      extraIgnorePatterns: resolvedTask ? resolvedTask.extraIgnorePatterns : [],
    }

    emit({
      type: 'session.context-resolved',
      context: resolvedContext,
    })

    const resolvedOptions = {
      ...resolvedContext,
      runtimePaths,
    }

    function eventBridge(event) {
      if (event.type !== 'phase' || event.status === 'failed' || event.status === 'cancelled')
        return

      emit({
        type: 'core.phase',
        phase: event.phase,
        status: event.status,
        message: event.message,
        progress: event.status === 'running' ? { current: event.current, total: event.total } : null,
      })
    }

    const coreResult = await syncCore(resolvedOptions, {
      events: { eventListener: eventBridge },
      interactions: { reviewDiff: runtime.interactions?.reviewDiff },
      dependents: runtime.dependents,
    }, cancelSignal)

    const sessionResult = { ...coreResult }
    if (sessionResult.result === 'cancelled')
      emit({ type: 'session.cancelled', result: sessionResult })
    else if (sessionResult.result === 'completed')
      emit({ type: 'session.completed', result: sessionResult })

    return sessionResult
  }
  catch (error) {
    if (cancelSignal?.aborted || error === cancelSignal?.reason) {
      const sessionResult = {
        result: 'cancelled',
        reason: 'abort-signal',
      }
      emit({
        type: 'session.cancelled',
        result: sessionResult,
      })
      return sessionResult
    }
    else {
      emit({
        type: 'session.failed',
        message: error?.message || String(error),
      })

      throw error
    }
  }
}
