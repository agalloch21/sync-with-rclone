import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RENDERER_SURFACE } from '#electron/contracts/renderer-surface.js'
import { getSyncSessionStageForPhase, SYNC_SESSION_STAGE } from '#electron/contracts/sync-session-stage.js'
import { SYNC_SESSION_EVENT } from '#src/app/operations/sync-operation-contract.js'
import { serializeDiffSnapshot } from '#src/app/services/sync-review-service.js'
import { loadRendererSurface } from '../load-renderer-surface.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createSessionWindow() {
  const { BrowserWindow, ipcMain, shell } = require('electron')
  const channelPrefix = `sync-session:${Date.now()}:${Math.random().toString(16).slice(2)}`
  const channels = {
    channelPrefix,
    // notification
    progressEvent: `${channelPrefix}:progress-event`,
    // handler
    getState: `${channelPrefix}:get-state`,
    confirmSync: `${channelPrefix}:confirm-sync`,
    cancelSync: `${channelPrefix}:cancel-sync`,
    closeWindow: `${channelPrefix}:close-window`,
    // command
    showLogInFolder: `${channelPrefix}:show-log-in-folder`,
  }

  let uiState = {
    context: {
      mode: '',
      localFolderPath: '',
      remoteFolderPath: '',
      bypassConfig: false,
    },
    stage: '',
    final: null,
    phase: '',
    message: '',
    progress: {
      activity: '',
      index: 0,
      total: 0,
      measurement: null,
    },
    review: {
      summary: {
        added: 0,
        modified: 0,
        deleted: 0,
      },
      tree: [],
    },
  }

  let isClosing = false
  let pendingReview = null
  let pendingFinalAcknowledgement = null
  let isSessionSealed = false

  const cancelController = new AbortController()
  function abortSession() {
    if (!cancelController.signal.aborted)
      cancelController.abort()
  }

  const sessionWindow = new BrowserWindow({
    width: 600,
    height: 600,
    minWidth: 500,
    minHeight: 500,
    autoHideMenuBar: true,
    frame: false,
    show: false,
    title: 'Sync Session',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/sync-session/index.cjs'),
      additionalArguments: [JSON.stringify(channels)],
    },
  })

  function patchUiState(patch, { notify = true } = {}) {
    uiState = {
      ...uiState,
      ...patch,
    }

    if (notify && !sessionWindow.isDestroyed())
      sessionWindow.webContents.send(channels.progressEvent, patch)
  }

  function createReviewResult(action, selectedPaths = []) {
    return { action, selectedPaths }
  }

  function settlePendingReview(action = 'cancel', selectedPaths = []) {
    if (!pendingReview)
      return

    const { resolve } = pendingReview
    pendingReview = null
    resolve(createReviewResult(action, selectedPaths))
  }

  function settleFinalAcknowledgement() {
    if (!pendingFinalAcknowledgement)
      return

    const { resolve } = pendingFinalAcknowledgement
    pendingFinalAcknowledgement = null
    resolve()
  }

  function cancelSession() {
    abortSession()
    settlePendingReview('cancel')
    settleFinalAcknowledgement()
  }

  function abandonSession(reason) {
    if (isSessionSealed)
      return

    if (reason)
      console.error(reason)

    cancelSession()
    sealSession()
  }

  function sealSession() {
    isSessionSealed = true
  }

  function onEventFromMain(event) {
    if (event.type === SYNC_SESSION_EVENT.STARTED || event.type === SYNC_SESSION_EVENT.RESULT) {
      // will use showFinalAcknowledgement() to receive result
      return
    }

    let nextState = null

    if (event.type === SYNC_SESSION_EVENT.CONTEXT_RESOLVED) {
      nextState = { context: event.context }
    }
    else if (event.type === SYNC_SESSION_EVENT.PROGRESS) {
      nextState = {
        stage: getSyncSessionStageForPhase(event.phase),
        phase: event.phase,
        message: event.message,
        progress: event.progress || null,
      }
    }

    if (nextState)
      patchUiState(nextState)
  }

  async function reviewDiffInWindow(diffSnapshot) {
    if (isSessionSealed)
      return createReviewResult('cancel')

    patchUiState({
      stage: SYNC_SESSION_STAGE.REVIEW,
      review: serializeDiffSnapshot(diffSnapshot),
    })

    return new Promise((resolve, reject) => {
      pendingReview = { resolve, reject }
    })
  }

  async function showFinalAcknowledgement(finalResult) {
    if (isSessionSealed)
      return

    patchUiState({
      final: finalResult,
    })

    return new Promise((resolve, reject) => {
      pendingFinalAcknowledgement = { resolve, reject }
    })
  }

  function handleCancel(_event) {
    if (pendingReview) {
      settlePendingReview('cancel')
      return { success: true, action: 'review-cancelled' }
    }

    cancelSession()
    return { success: true, action: 'sync-cancel-requested' }
  }

  function handleConfirm(_event, payload) {
    if (!pendingReview)
      return { success: false, action: 'ignored', reason: 'no-pending-review' }

    const selectedPaths = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : []
    settlePendingReview('confirm', selectedPaths)
    return { success: true, action: 'review-confirmed' }
  }

  function handleClose(_event) {
    settleFinalAcknowledgement()
    return { success: true, action: 'final-acknowledged' }
  }

  function showLogInFolder() {
    if (uiState.final?.logPath)
      shell.showItemInFolder(uiState.final.logPath)
  }

  ipcMain.handle(channels.getState, () => uiState)
  ipcMain.handle(channels.cancelSync, handleCancel)
  ipcMain.handle(channels.confirmSync, handleConfirm)
  ipcMain.handle(channels.closeWindow, handleClose)
  ipcMain.on(channels.showLogInFolder, showLogInFolder)

  const cleanup = () => {
    ipcMain.removeHandler(channels.getState)
    ipcMain.removeHandler(channels.cancelSync, handleCancel)
    ipcMain.removeHandler(channels.confirmSync, handleConfirm)
    ipcMain.removeHandler(channels.closeWindow, handleClose)
    ipcMain.removeListener(channels.showLogInFolder, showLogInFolder)
  }

  function closeWindow() {
    if (isClosing)
      return

    isClosing = true
    cleanup()
    settlePendingReview('cancel')
    settleFinalAcknowledgement()

    if (!sessionWindow.isDestroyed())
      sessionWindow.close()
  }

  function focusWindow() {
    if (sessionWindow.isDestroyed())
      return

    if (sessionWindow.isMinimized())
      sessionWindow.restore()
    sessionWindow.show()
    sessionWindow.focus()
  }

  sessionWindow.on('closed', () => {
    cleanup()

    if (!isClosing)
      abandonSession(new Error('Session window was closed before session cleanup.'))
  })

  sessionWindow.once('ready-to-show', () => {
    sessionWindow.show()
  })

  sessionWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  sessionWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    abandonSession(new Error(`Renderer failed to load: ${errorCode} ${errorDescription} ${validatedURL}`))
  })

  sessionWindow.webContents.on('render-process-gone', (_, details) => {
    abandonSession(new Error(`Renderer process gone: ${details.reason}`))
  })

  loadRendererSurface(sessionWindow, RENDERER_SURFACE.SYNC_SESSION)
    .catch((error) => {
      abandonSession(error)
    })

  if (process.env.DEBUG_ELECTRON === '1')
    sessionWindow.webContents.openDevTools({ mode: 'detach' })

  return {
    onEventFromMain,
    reviewDiffInWindow,
    showFinalAcknowledgement,

    closeWindow,
    focusWindow,
    cancelSignal: cancelController.signal,
    abortSession,
  }
}
