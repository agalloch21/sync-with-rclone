const { app, dialog } = require('electron')
const {
  classifyLaunch,
  isDesktopLaunchRequest,
} = require('./launch-classifier.cjs')
// const { initializeMacSetupIfNeeded } = require('./electron/main/macos-dmg-initialization.cjs')

let desktopApplication = null
const initialLaunch = classifyLaunch(process.argv)
const isCliMode = initialLaunch.type === 'cli'

async function showStartupError(error) {
  console.error(error)

  if (isCliMode) {
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

async function ensureConfiguration() {
  const { ensureAppConfig } = await import('#src/infrastructure/configuration/app-config-store.js')
  await ensureAppConfig()
}

async function runCliMode() {
  await ensureConfiguration()
  const { runCli } = await import('#cli/commands.js')
  const exitCode = await runCli(initialLaunch.argv)
  app.exit(exitCode)
}

async function runDesktopMode(initialRequest) {
  await ensureConfiguration()
  const { createDesktopApplication } = await import('#electron/main/desktop-application.js')
  desktopApplication = createDesktopApplication({ app })
  await desktopApplication.routeLaunch(initialRequest)
  return desktopApplication
}

if (isCliMode) {
  app.whenReady()
    .then(runCliMode)
    .catch(showStartupError)
}
else {
  const hasSingleInstanceLock = app.requestSingleInstanceLock({
    launchRequest: initialLaunch,
  })

  if (!hasSingleInstanceLock) {
    app.quit()
  }
  else {
    const desktopReady = app.whenReady()
      .then(() => runDesktopMode(initialLaunch))

    desktopReady.catch(showStartupError)

    app.on('second-instance', (_event, argv, _workingDirectory, additionalData) => {
      const request = isDesktopLaunchRequest(additionalData?.launchRequest)
        ? additionalData.launchRequest
        : classifyLaunch(argv)

      desktopReady
        .then(desktop => desktop.routeLaunch(request))
        .catch(showStartupError)
    })

    app.on('activate', () => {
      desktopReady
        .then(desktop => desktop.ensureMainWindow())
        .catch(showStartupError)
    })

    app.on('window-all-closed', () => {
      desktopApplication?.handleWindowAllClosed()
    })

    app.on('before-quit', () => {
      desktopApplication?.beginQuit()
    })
  }
}
