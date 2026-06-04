const { app, dialog } = require('electron')
// const { initializeMacSetupIfNeeded } = require('./macos-dmg-initialization.cjs')

let isSyncInProgress = false
const SESSION_FLAGS = new Set(['--session', '--sync-session'])

async function showStartupError(error) {
  console.error(error)

  await dialog.showMessageBox({
    type: 'error',
    title: 'sync-with-rclone failed',
    message: 'Failed to start sync-with-rclone',
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
  const argv = process.argv.slice(2)
  const [{ runMainPanel }, { runSyncSession }] = await Promise.all([
    import('./main-panel-runner.js'),
    import('./session-runner.js'),
  ])

  if (!argv.some(arg => SESSION_FLAGS.has(arg))) {
    await runMainPanel()
    return
  }

  isSyncInProgress = true
  let exitCode = 1
  try {
    exitCode = await runSyncSession(argv)
  }
  finally {
    isSyncInProgress = false
  }

  if (exitCode)
    app.exit(exitCode)
  else
    app.quit()
}
