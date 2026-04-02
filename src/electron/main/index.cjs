const { app } = require('electron')

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
    const [{ startSync }, { reviewDiffInWindow }] = await Promise.all([
      import('#src/app/start-sync.js'),
      import('./review-window.js'),
    ])

    const options = parseArgs(process.argv)
    await startSync(options, {
      reviewDiff: reviewDiffInWindow,
    })
  }
  catch (error) {
    console.error(error)
    app.exit(1)
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
