import { createRequire } from 'node:module'
import { startSyncSession } from './controller.js'

const require = createRequire(import.meta.url)

export function createSyncSessionManager() {
  const { app, BrowserWindow } = require('electron')
  const sessions = new Map()
  let nextSessionId = 1
  let isShuttingDown = false

  function trackSession(request) {
    const handle = startSyncSession(request)
    const sessionId = nextSessionId++
    const session = { id: sessionId, handle }
    sessions.set(sessionId, session)

    Promise.resolve(handle.completion)
      .catch(error => console.error(error))
      .finally(() => {
        sessions.delete(sessionId)
        if (!isShuttingDown && sessions.size === 0 && BrowserWindow.getAllWindows().length === 0)
          app.quit()
      })

    return session
  }

  function launch(argv = []) {
    if (isShuttingDown)
      return { status: 'ignored', reason: 'shutting-down' }

    const session = trackSession({ argv })
    return { status: 'started', sessionId: session.id }
  }

  function shutdown() {
    isShuttingDown = true
    for (const session of sessions.values())
      session.handle.abortSession()
  }

  return {
    launch,
    shutdown,
    get size() {
      return sessions.size
    },
  }
}
