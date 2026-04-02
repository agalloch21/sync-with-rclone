import { app } from 'electron'
import { syncCore } from '#src/core/sync-engine.js'
import { reviewDiffInWindow } from './review-window.js'

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
    const options = parseArgs(process.argv)
    await syncCore(options, {
      reviewDiff: reviewDiffInWindow,
    })
  }
  catch (error) {
    console.error(error)
    app.exit(1)
    return
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
