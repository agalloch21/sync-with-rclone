export async function runSyncSession(argv = []) {
  let sessionWindowHooks = null
  let runError = null
  let syncResult = null

  const [{ startSync }, { parseSyncArgs }, { createSessionWindow }, { SYNC_RESULT, PHASES }] = await Promise.all([
    import('#src/app/start-sync.js'),
    import('#src/app/parse-sync-args.js'),
    import('./session-window.js'),
    import('#src/core/contract.js'),
  ])

  const options = parseSyncArgs(argv.filter(arg => arg !== '--session' && arg !== '--sync-session'))

  sessionWindowHooks = createSessionWindow()

  try {
    syncResult = await startSync(options, {
      events: { eventListener: sessionWindowHooks.onEventFromMain },
      interactions: { reviewDiff: sessionWindowHooks.reviewDiffInWindow },
    }, sessionWindowHooks.cancelSignal)

    if (syncResult.result === SYNC_RESULT.COMPLETED
      || syncResult.result === SYNC_RESULT.FAILED
      || (syncResult.result === SYNC_RESULT.CANCELLED && (syncResult.phase === PHASES.APPLY_PLAN || syncResult.phase === PHASES.GENERATE_PLAN))) {
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
}
