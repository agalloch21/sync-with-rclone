const { app, dialog } = require('electron')

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

  const [{ startSync }, { parseSyncArgs }, { createSessionWindow }] = await Promise.all([
    import('#src/app/start-sync.js'),
    import('#src/app/parse-sync-args.js'),
    import('./session-window.js'),
  ])

  const options = parseSyncArgs(process.argv.slice(2))

  sessionWindowHooks = createSessionWindow()

  isSyncInProgress = true
  try {
    const syncResult = await startSync(options, {
      events: { eventListener: sessionWindowHooks.onEventFromCore },
      interactions: { reviewDiff: sessionWindowHooks.reviewDiffInWindow },
    }, sessionWindowHooks.cancelSignal)
  }
  catch (error) {
    runError = error
    console.error(error)
  }
  finally {
    isSyncInProgress = false
  }

  try {
    await sessionWindowHooks.waitForFinalAcknowledgeIfNeeded()
  }
  catch (error) {
    runError ||= error
    console.error(error)
  }
  finally {
    sessionWindowHooks.closeWindow()
  }

  if (runError)
    app.exit(1)
  else
    app.quit()
}
