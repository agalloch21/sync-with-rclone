import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isLastPhase } from '#src/core/phases.js'
import { serializeDiffSnapshot } from '#src/core/serialize-diff-snapshot.js'
import { getStepForPhase, STEPS } from './session-steps.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const rendererDistDirectory = path.join(__dirname, '../renderer/dist')

function normalizeDevServerUrl(input) {
  return input ? input.replace(/\/$/, '') : ''
}

function getRendererEntryTarget(pageName) {
  const devServerUrl = normalizeDevServerUrl(process.env.ELECTRON_RENDERER_DEV_SERVER_URL)

  if (devServerUrl) {
    return {
      type: 'url',
      value: `${devServerUrl}/${pageName}.html`,
    }
  }

  return {
    type: 'file',
    value: path.join(rendererDistDirectory, `${pageName}.html`),
  }
}

function loadRendererPage(browserWindow, pageName) {
  const target = getRendererEntryTarget(pageName)
  return target.type === 'url'
    ? browserWindow.loadURL(target.value)
    : browserWindow.loadFile(target.value)
}

export function createSessionWindow() {
  const { BrowserWindow, ipcMain } = require('electron')
  const channelPrefix = `sync-session:${Date.now()}:${Math.random().toString(16).slice(2)}`
  const channels = {
    channelPrefix,
    // notification
    progressEvent: `${channelPrefix}:progress-event`,
    // handler
    getState: `${channelPrefix}:get-state`,
    // event
    confirmSync: `${channelPrefix}:confirm-sync`,
    cancelSync: `${channelPrefix}:cancel-sync`,
    closeWindow: `${channelPrefix}:close-window`,

  }

  let uiState = {
    context: {
      mode: '',
      localFolderPath: '',
      remoteFolderPath: '',
      bypassConfig: false,
    },
    step: '',
    final: null,
    phase: {
      name: '',
      status: '',
      message: '',
    },
    progress: {
      current: 0,
      total: 0,
      message: '',
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
  let finalAcknowledgementSettled = false
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
      preload: path.join(__dirname, '../preload/session-preload.cjs'),
      additionalArguments: [JSON.stringify(channels)],
    },
  })

  function updateOptions(options) {
    const context = {
      mode: options.mode,
      localFolderPath: options.localFolderPath,
      remoteFolderPath: options.remoteFolderPath,
      bypassConfig: options.bypassConfig,
    }
    patchUiState({ context })
  }

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
    finalAcknowledgementSettled = true

    if (!pendingFinalAcknowledgement)
      return

    const { resolve } = pendingFinalAcknowledgement
    pendingFinalAcknowledgement = null
    resolve()
  }

  function completeSession(extraPatch = {}) {
    if (isSessionSealed)
      return

    sealSession()
    patchUiState({
      ...extraPatch,
      final: {
        kind: 'completed',
      },
    })
  }

  function cancelSession(extraPatch = {}) {
    if (isSessionSealed)
      return

    sealSession()
    abortSession()
    settlePendingReview('cancel')
    patchUiState({
      ...extraPatch,
      final: {
        kind: 'cancelled',
      },
    })
  }

  function failSession(error, extraPatch = {}) {
    if (isSessionSealed)
      return

    sealSession()
    settlePendingReview('cancel')
    patchUiState({
      ...extraPatch,
      final: {
        kind: 'error',
        message: error?.message || String(error),
        detail: error?.stack || '',
      },
    })
  }

  function abandonSession(reason) {
    if (reason)
      console.error(reason)

    if (!isSessionSealed) {
      sealSession()
      abortSession()
      settlePendingReview('cancel')
    }

    settleFinalAcknowledgement()
  }

  function sealSession() {
    isSessionSealed = true
  }

  function onEventFromCore(event) {
    const nextState = {}
    nextState.phase = {
      name: event.phase,
      status: event.status,
      message: event.message,
    }

    switch (event.status) {
      case 'started':
        nextState.step = getStepForPhase(nextState.phase.name)
        patchUiState(nextState)
        break
      case 'running':
        nextState.progress = {}
        nextState.progress.current = event.current
        nextState.progress.total = event.total
        nextState.progress.message = event.message
        patchUiState(nextState)
        break
      case 'done':
        if (isLastPhase(event.phase)) {
          completeSession(nextState)
        }
        else {
          patchUiState(nextState)
        }
        break
      case 'cancelled':
        cancelSession(nextState)
        break
      case 'failed':
        failSession(event.message, nextState)
        break
    }
  }

  async function reviewDiffInWindow(diffSnapshot) {
    if (isSessionSealed || cancelController.signal.aborted)
      return createReviewResult('cancel')

    patchUiState({
      step: STEPS.REVIEW,
      review: serializeDiffSnapshot(diffSnapshot),
    })

    return new Promise((resolve, reject) => {
      pendingReview = { resolve, reject }
    })
  }

  async function waitForFinalAcknowledgeIfNeeded() {
    if (finalAcknowledgementSettled)
      return Promise.resolve()

    if (pendingFinalAcknowledgement)
      return pendingFinalAcknowledgement.promise

    let resolve
    const promise = new Promise((innerResolve) => {
      resolve = innerResolve
    })

    pendingFinalAcknowledgement = { promise, resolve }
    return promise
  }

  function handleCancel(_event) {
    cancelSession()
  }

  function handleConfirm(_event, payload) {
    const selectedPaths = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : []
    settlePendingReview('confirm', selectedPaths)
  }

  function handleClose(_event) {
    settleFinalAcknowledgement()
  }

  ipcMain.handle(channels.getState, () => uiState)
  ipcMain.on(channels.cancelSync, handleCancel)
  ipcMain.on(channels.confirmSync, handleConfirm)
  ipcMain.on(channels.closeWindow, handleClose)

  const cleanup = () => {
    ipcMain.removeHandler(channels.getState)
    ipcMain.removeListener(channels.cancelSync, handleCancel)
    ipcMain.removeListener(channels.confirmSync, handleConfirm)
    ipcMain.removeListener(channels.closeWindow, handleClose)
  }
  function closeWindow() {
    if (isClosing)
      return

    sealSession()

    isClosing = true
    cleanup()
    settlePendingReview('cancel')
    settleFinalAcknowledgement()

    if (!sessionWindow.isDestroyed())
      sessionWindow.close()
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
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  sessionWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    abandonSession(new Error(`Renderer failed to load: ${errorCode} ${errorDescription} ${validatedURL}`))
  })

  sessionWindow.webContents.on('render-process-gone', (_, details) => {
    abandonSession(new Error(`Renderer process gone: ${details.reason}`))
  })

  loadRendererPage(sessionWindow, 'sync-session')
    .catch((error) => {
      abandonSession(error)
    })

  if (process.env.DEBUG_ELECTRON === '1')
    sessionWindow.webContents.openDevTools({ mode: 'detach' })

  return {
    onEventFromCore,
    reviewDiffInWindow,
    updateOptions,
    waitForFinalAcknowledgeIfNeeded,

    closeWindow,
    cancelSignal: cancelController.signal,
    abortSession,
  }
}
