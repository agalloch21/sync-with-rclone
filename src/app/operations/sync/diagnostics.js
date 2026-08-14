import { writeDiagnostic } from '#src/infrastructure/runtime/diagnostics-log.js'
import { APP_ERROR_CODE } from '../../app-errors.js'

function summarizeContext(context = {}) {
  return {
    mode: typeof context.mode === 'string' ? context.mode : '',
    localFolderPath: typeof context.localFolderPath === 'string' ? context.localFolderPath : '',
    remoteFolderPath: typeof context.remoteFolderPath === 'string' ? context.remoteFolderPath : '',
    ...(context.bypassConfig !== undefined && { bypassConfig: Boolean(context.bypassConfig) }),
  }
}

export function createSyncDiagnostics(runtimePaths) {
  let context = null
  let phase = null
  let activity = null

  function buildContext() {
    const observedContext = {
      ...(context && context),
      ...(phase && { failedPhase: phase }),
      ...(activity && { failedActivity: activity }),
    }
    return Object.keys(observedContext).length > 0 ? observedContext : undefined
  }

  return {
    contextResolved(resolvedContext) {
      context = summarizeContext(resolvedContext)
    },

    phase(phaseEvent) {
      if (typeof phaseEvent?.phase === 'string' && phaseEvent.phase !== phase) {
        phase = phaseEvent.phase
        activity = null
      }
      if (typeof phaseEvent?.progress?.activity === 'string')
        activity = phaseEvent.progress.activity
    },

    result(sessionResult) {
      if (sessionResult?.result !== 'failed')
        return Promise.resolve()
      if (sessionResult.error?.code === APP_ERROR_CODE.SYNC_SESSION_OVERLAP)
        return Promise.resolve()

      return writeDiagnostic({
        source: 'sync',
        context: buildContext(),
        error: sessionResult.error,
      }, runtimePaths)
    },

    warning(source, error) {
      return writeDiagnostic({
        source,
        level: 'warning',
        context: buildContext(),
        error,
      }, runtimePaths)
    },

    unexpected(error) {
      return writeDiagnostic({
        source: 'sync',
        context: buildContext(),
        error,
      }, runtimePaths)
    },
  }
}
