const { app, dialog } = require('electron')
let isSyncInProgress = false

function parseArgs(argv) {
  const [, , mode, localFolderPath, remoteFolderPath] = argv
  return {
    mode: mode || 'push',
    localFolderPath,
    remoteFolderPath,
  }
}

app.whenReady().then(async () => {
  try {
    const [{ startSync }, { reviewDiffInWindow }, { createProgressWindowController }] = await Promise.all([
      import('#src/app/start-sync.js'),
      import('./review-window.js'),
      import('./progress-window.js'),
    ])

    const options = parseArgs(process.argv)
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
