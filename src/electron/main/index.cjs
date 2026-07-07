const { app, dialog } = require('electron')
const { isCliCommandMode, runCliCommand } = require('./cli-dispatch.cjs')
// const { initializeMacSetupIfNeeded } = require('./macos-dmg-initialization.cjs')

let isSyncInProgress = false
const SESSION_FLAGS = new Set(['--session', '--sync-session'])

async function showStartupError(error) {
  console.error(error)

  if (isCliCommandMode(process.argv)) {
    app.exit(1)
    return
  }

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
  const argv = process.argv.slice(1)
  const { ensureAppConfig } = await import('#src/app/configuration/app-config.js')

  await ensureAppConfig()

  if (argv.some(arg => SESSION_FLAGS.has(arg)))
    return runSyncSessionMode(argv)

  if (isCliCommandMode(process.argv)) {
    const exitCode = await runCliCommand(process.argv)
    app.exit(exitCode)
    return
  }

  const { runMainWindow } = await import('./main-window/runner.js')
  await runMainWindow()
}

async function runSyncSessionMode(argv) {
  const { runSyncSession } = await import('./sync-session/runner.js')
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
