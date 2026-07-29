import { startSync } from '#src/app/app-api.js'
import { SYNC_PHASES, SYNC_RESULT } from '#src/app/sync-session/contract.js'
import { parseSyncArgs } from '#src/app/sync-session/parse-sync-args.js'
import { resolveSyncContext } from '#src/app/sync-session/resolve-sync-context.js'
import { createSessionWindow } from './window.js'

function parseSessionOptions(argv = []) {
  const options = parseSyncArgs(argv.filter(arg => arg !== '--session' && arg !== '--sync-session'))
  return options
}

export async function resolveSyncSessionRequest(argv = []) {
  const options = parseSessionOptions(argv)
  const prepared = await resolveSyncContext(options)
  return { argv, options, prepared }
}

export function startSyncSession(request) {
  const options = request?.options || parseSessionOptions(request?.argv || [])
  const prepared = request?.prepared || null
  const sessionWindowHooks = createSessionWindow()

  const completion = (async () => {
    let runError = null
    let syncResult = null

    try {
      syncResult = await startSync(options, {
        events: { eventListener: sessionWindowHooks.onEventFromMain },
        interactions: { reviewDiff: sessionWindowHooks.reviewDiffInWindow },
      }, sessionWindowHooks.cancelSignal, prepared)

      if (syncResult.result === SYNC_RESULT.COMPLETED
        || syncResult.result === SYNC_RESULT.FAILED
        || (syncResult.result === SYNC_RESULT.CANCELLED && (syncResult.phase === SYNC_PHASES.APPLY_PLAN || syncResult.phase === SYNC_PHASES.GENERATE_PLAN))) {
        await sessionWindowHooks.showFinalAcknowledgement(syncResult)
      }
    }
    catch (error) {
      runError = error
      console.error(error)
    }
    finally {
      sessionWindowHooks.closeWindow()
    }

    return runError || syncResult?.result === SYNC_RESULT.FAILED ? 1 : 0
  })()

  return {
    completion,
    focusWindow: sessionWindowHooks.focusWindow,
    abortSession: sessionWindowHooks.abortSession,
  }
}
