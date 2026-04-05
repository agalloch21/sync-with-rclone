const { app, dialog, shell } = require('electron')
const { ensureMacAppSupport } = require('./macos-install.cjs')
let isSyncInProgress = false

function shouldHandleMacSetup(options) {
  return process.platform === 'darwin' && app.isPackaged && !options.localFolderPath
}

app.whenReady().then(async () => {
  try {
    const [{ startSync }, { parseSyncArgs }, { reviewDiffInWindow }, { createProgressWindowController }] = await Promise.all([
      import('#src/app/start-sync.js'),
      import('#src/app/parse-sync-args.js'),
      import('./review-window.js'),
      import('./progress-window.js'),
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

    let progressWindow = null

    isSyncInProgress = true
    const result = await startSync(options, {
      reviewDiff: reviewDiffInWindow,
      onApplyEvent: (event) => {
        progressWindow ||= createProgressWindowController()
        progressWindow.handleEvent(event)
      },
    })
    isSyncInProgress = false

    if (result.applyResult?.action === 'cancel') {
      console.log('Sync cancelled by user')
      await dialog.showMessageBox({
        type: 'info',
        title: 'Sync Cancelled',
        message: 'Sync cancelled',
        detail: 'No apply operations were executed.',
      })
    }
    else {
      console.log(`Sync finished with ${result.applyResult?.phases?.length || 0} phase(s)`)
      await dialog.showMessageBox({
        type: 'info',
        title: 'Sync Completed',
        message: 'Sync completed successfully',
        detail: `Executed ${result.applyResult?.phases?.length || 0} phase(s).`,
      })
    }

    await progressWindow?.close()
    app.quit()
  }
  catch (error) {
    isSyncInProgress = false
    console.error(error)
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
