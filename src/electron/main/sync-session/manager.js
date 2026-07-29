import { createRequire } from 'node:module'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import { resolveSyncSessionRequest, startSyncSession } from './controller.js'

const require = createRequire(import.meta.url)

function trimPath(value) {
  const normalized = String(value || '').replaceAll('\\', '/')
  if (normalized === '/')
    return normalized
  return normalized.replace(/\/+$/, '')
}

function normalizeLocalPath(value, platform = process.platform) {
  const normalized = trimPath(value)
  return platform === 'win32' ? normalized.toLowerCase() : normalized
}

function parseRemotePath(value) {
  const normalized = trimPath(value)
  const separatorIndex = normalized.indexOf(':')
  if (separatorIndex < 0)
    return { remote: '', folderPath: normalized }

  return {
    remote: normalized.slice(0, separatorIndex),
    folderPath: normalized.slice(separatorIndex + 1).replace(/^\/+/, ''),
  }
}

function isSameOrNested(left, right) {
  if (left === right)
    return true
  if (!left || !right || left === '/' || right === '/')
    return true
  return left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

export function localPathsOverlap(left, right, platform = process.platform) {
  return isSameOrNested(
    normalizeLocalPath(left, platform),
    normalizeLocalPath(right, platform),
  )
}

export function remotePathsOverlap(left, right) {
  const leftRemote = parseRemotePath(left)
  const rightRemote = parseRemotePath(right)
  return leftRemote.remote === rightRemote.remote
    && isSameOrNested(leftRemote.folderPath, rightRemote.folderPath)
}

export function sessionDescriptorsOverlap(left, right, platform = process.platform) {
  return localPathsOverlap(left.localFolderPath, right.localFolderPath, platform)
    || remotePathsOverlap(left.remoteFolderPath, right.remoteFolderPath)
}

function createDescriptor(request) {
  const context = request.prepared.context
  return {
    localFolderPath: context.localFolderPath,
    remoteFolderPath: context.remoteFolderPath,
  }
}

function createOverlapError(requested, active) {
  return new AppError({
    code: APP_ERROR_CODE.SYNC_SESSION_OVERLAP,
    message: 'Another sync session is already using an overlapping local or remote folder.',
    meta: { requested, active },
  })
}

export function createSyncSessionManager() {
  const { app, BrowserWindow } = require('electron')
  const sessions = new Map()
  let nextSessionId = 1
  let isShuttingDown = false

  function findConflict(descriptor) {
    for (const session of sessions.values()) {
      if (session.descriptor && sessionDescriptorsOverlap(descriptor, session.descriptor))
        return session
    }
    return null
  }

  function trackSession(request, descriptor) {
    const handle = startSyncSession(request)
    const sessionId = nextSessionId++
    const session = { id: sessionId, descriptor, handle }
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

  async function launch(argv = []) {
    if (isShuttingDown)
      return { status: 'ignored', reason: 'shutting-down' }

    let request
    try {
      request = await resolveSyncSessionRequest(argv)
    }
    catch {
      const session = trackSession({ argv }, null)
      return { status: 'started', sessionId: session.id }
    }

    if (isShuttingDown)
      return { status: 'ignored', reason: 'shutting-down' }

    const descriptor = createDescriptor(request)
    const conflict = findConflict(descriptor)
    if (conflict) {
      conflict.handle.focusWindow()
      const error = createOverlapError(descriptor, conflict.descriptor)
      return {
        status: 'conflict',
        sessionId: conflict.id,
        error,
      }
    }

    const session = trackSession(request, descriptor)
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
