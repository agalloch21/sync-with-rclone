const { app, dialog } = require('electron')
const path = require('node:path')
// const { initializeMacSetupIfNeeded } = require('./macos-dmg-initialization.cjs')

let isSyncInProgress = false

async function showStartupError(error) {
  console.error(error)

  await dialog.showMessageBox({
    type: 'error',
    title: 'Sync Failed',
    message: 'Sync failed',
    detail: error?.message || String(error),
  })

  app.exit(1)
}

app.whenReady().then(main).catch(showStartupError)

app.on('window-all-closed', () => {
  if (isSyncInProgress)
    return

  app.quit()
})

async function main() {
  let sessionWindowHooks = null
  let runError = null

  const [{ startSync }, { parseSyncArgs }, { getRuntimePaths }, { createSessionWindow }, { SYNC_RESULT, PHASES }] = await Promise.all([
    import('#src/app/start-sync.js'),
    import('#src/app/parse-sync-args.js'),
    import('#src/app/runtime-paths.js'),
    import('./session-window.js'),
    import('#src/core/contract.js'),
  ])

  const options = parseSyncArgs(process.argv.slice(2))
  const runtimePaths = getRuntimePaths()

  // DMG first-launch setup used to run here when no localFolderPath was passed.
  // PKG install now owns setup/config bootstrap, so normal launches go straight
  // into the sync session. Re-enable macos-dmg-initialization.cjs only if DMG
  // first-launch support returns.
  // if (await initializeMacSetupIfNeeded(app, dialog, shell, options.localFolderPath))
  // return

  sessionWindowHooks = createSessionWindow()

  isSyncInProgress = true
  let syncResult = null
  try {
    syncResult = await startSync(options, {
      events: { eventListener: sessionWindowHooks.onEventFromMain },
      interactions: { reviewDiff: sessionWindowHooks.reviewDiffInWindow },
    }, sessionWindowHooks.cancelSignal)

    if (syncResult.result === SYNC_RESULT.FAILED)
      syncResult.logPath = path.posix.join(runtimePaths.logDirectory, 'quick-actions.log')

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
    isSyncInProgress = false
    sessionWindowHooks.closeWindow()
  }

  if (runError || syncResult?.result === SYNC_RESULT.FAILED)
    app.exit(1)
  else
    app.quit()
}
