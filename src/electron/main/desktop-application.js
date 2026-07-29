import { getMainWindow } from './app-state.js'
import { createMainWindow } from './main-window/window.js'
import { createSyncSessionManager } from './sync-session/manager.js'

export function createDesktopApplication({ app }) {
  let mainWindowPromise = null

  async function ensureMainWindow() {
    let mainWindow = getMainWindow()
    const isNewWindow = !mainWindow
    if (!mainWindow) {
      if (!mainWindowPromise)
        mainWindowPromise = Promise.resolve(createMainWindow())

      try {
        mainWindow = await mainWindowPromise
      }
      finally {
        mainWindowPromise = null
      }
    }
    if (!isNewWindow) {
      if (mainWindow?.isMinimized())
        mainWindow.restore()
      mainWindow?.show()
      mainWindow?.focus()
    }
    return mainWindow
  }

  const sessionManager = createSyncSessionManager()

  async function routeLaunch(request) {
    if (request?.type === 'session')
      return await sessionManager.launch(request.argv)

    return await ensureMainWindow()
  }

  function handleWindowAllClosed() {
    if (sessionManager.size === 0)
      app.quit()
  }

  function beginQuit() {
    sessionManager.shutdown()
  }

  return {
    routeLaunch,
    ensureMainWindow,
    handleWindowAllClosed,
    beginQuit,
    get activeSessionCount() {
      return sessionManager.size
    },
  }
}
