const { app, dialog, shell } = require('electron')
const { ensureMacAppSupport } = require('./macos-install.cjs')

let isSyncInProgress = false

function shouldHandleMacSetup(options) {
  return process.platform === 'darwin' && app.isPackaged && !options.localFolderPath
}

app.whenReady().then(async () => {
  let sessionWindowHooks = null
  let runError = null

  try {
    const [{ startSync }, { parseSyncArgs }, { createSessionWindow }] = await Promise.all([
      import('#src/app/start-sync.js'),
      import('#src/app/parse-sync-args.js'),
      import('./session-window.js'),
    ])

    const options = parseSyncArgs(process.argv.slice(2))

    if (shouldHandleMacSetup(options)) {
      const setup = await ensureMacAppSupport(app.getVersion())
      if (!setup.hasSetupChanges) {
        app.quit()
        return
      }

      if (!setup.shouldShowSetupDialog) {
        app.quit()
        return
      }

      const detail = [
        `Config: ${setup.configPath}`,
        `Quick Actions: ${setup.contextMenuInstalled ? 'installed or refreshed' : setup.contextMenuAlreadyInstalled ? 'already available' : 'not installed'}`,
        setup.configCreated ? 'Created config.json from template.' : 'Reused existing config.json.',
        setup.rcloneTemplateCreated ? 'Created rclone.conf template.' : 'Reused existing rclone.conf.',
      ].join('\n')
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: 'sync-with-rclone',
        message: 'macOS setup is ready',
        detail,
        buttons: ['Open Config', 'Close'],
        defaultId: 0,
        cancelId: 1,
      })

      if (response === 0)
        await shell.openPath(setup.configPath)

      app.quit()
      return
    }

    sessionWindowHooks = createSessionWindow()

    isSyncInProgress = true
    try {
      await startSync(options, {
        reviewPortal: sessionWindowHooks.reviewDiffInWindow,
        onEvent: sessionWindowHooks.onEventFromCore,
        onOptionsResolved: sessionWindowHooks.updateOptions,
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
  catch (error) {
    isSyncInProgress = false
    console.error(error)

    if (sessionWindowHooks) {
      sessionWindowHooks.abortSession()
      sessionWindowHooks.closeWindow()
    }

    await dialog.showMessageBox({
      type: 'error',
      title: 'Sync Failed',
      message: 'Sync failed',
      detail: error?.message || String(error),
    })

    app.exit(1)
  }
})

app.on('window-all-closed', () => {
  if (isSyncInProgress)
    return
  app.quit()
})
