import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isFirstPhase, isLastPhase } from '#src/core/phases.js'
import { serializeDiffSnapshot } from '#src/core/serialize-diff-snapshot.js'
import { getStepForPhase, SESSION_STATES, STEPS } from './session-steps.js'

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

  let state = {
    context: {
      mode: '',
      localFolderPath: '',
      remoteFolderPath: '',
      bypassConfig: false,
    },
    session: SESSION_STATES.IDLE,
    step: '',
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
    error: {
      message: '',
      detail: '',
    },
  }

  let isClosing = false
  let pendingReview = { resolve: null, reject: null, settled: false }
  let pendingFinalAcknowledgement = { resolve: null, reject: null, settled: false }

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
    state.context = {
      mode: options.mode,
      localFolderPath: options.localFolderPath,
      remoteFolderPath: options.remoteFolderPath,
      bypassConfig: options.bypassConfig,
    }
  }

  function updateState(nextState) {
    state = {
      ...state,
      ...nextState,
    }
  }

  function sendProgressToRenderer(nextState) {
    if (!sessionWindow.isDestroyed())
      sessionWindow.webContents.send(channels.progressEvent, nextState)
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
        if (isFirstPhase(event.phase))
          nextState.session = SESSION_STATES.RUNNING
        nextState.step = getStepForPhase(nextState.phase.name)
        break
      case 'done':
        if (isLastPhase(event.phase))
          nextState.session = SESSION_STATES.COMPLETED
        break
      case 'cancelled':
        nextState.session = SESSION_STATES.CANCELLED
        break
      case 'failed':
        nextState.session = SESSION_STATES.ERROR
        nextState.error = {}
        nextState.error.message = event.message
        break
      case 'running':
        nextState.progress = {}
        nextState.progress.current = event.current
        nextState.progress.total = event.total
        nextState.progress.message = event.message
        break
    }

    updateState(nextState)

    sendProgressToRenderer(nextState)
  }

  async function reviewDiffInWindow(diffSnapshot) {
    if (pendingReview.settled) {
      return createReviewResult('cancel')
    }

    const nextState = {
      review: serializeDiffSnapshot(diffSnapshot),
    }

    updateState(nextState)

    sendProgressToRenderer(nextState)

    return new Promise((resolve, reject) => {
      pendingReview = {
        resolve,
        reject,
      }
    })
  }

  async function waitForFinalAcknowledgeIfNeeded() {
    if (pendingFinalAcknowledgement.settled) {
      return
    }

    return new Promise((resolve, reject) => {
      pendingFinalAcknowledgement = { resolve, reject }
    })
  }

  function createReviewResult(action, selectedPaths = []) {
    return { action, selectedPaths }
  }

  function settlePendingReview(action = 'cancel', selectedPaths = []) {
    pendingReview.resolve?.(createReviewResult(action, selectedPaths))
    pendingReview = { resolve: null, reject: null, settled: true }
  }

  function settleFinalAcknowledgement() {
    pendingFinalAcknowledgement.resolve?.()
    pendingFinalAcknowledgement = { resolve: null, reject: null, settled: true }
  }

  function handleCancel(_event) {
    settlePendingReview('cancel')
    abortSession()
  }

  function handleConfirm(_event, payload) {
    const selectedPaths = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : []
    settlePendingReview('confirm', selectedPaths)
  }

  function handleClose(_event) {
    settleFinalAcknowledgement()
  }

  ipcMain.handle(channels.getState, () => state)
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

    isClosing = true

    // Normal close also releases any leftover waits.
    settlePendingReview()
    settleFinalAcknowledgement()
    cleanup()

    if (!sessionWindow.isDestroyed())
      sessionWindow.close()
  }

  function forceFinishSession(reason) {
    if (reason)
      console.error(reason)

    abortSession()
    settlePendingReview()
    settleFinalAcknowledgement()
  }

  sessionWindow.on('closed', () => {
    cleanup()

    if (!isClosing)
      forceFinishSession(new Error('Session window was closed before sync finished.'))
  })

  sessionWindow.once('ready-to-show', () => {
    sessionWindow.show()
  })

  sessionWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  sessionWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    forceFinishSession(new Error(`Renderer failed to load: ${errorCode} ${errorDescription} ${validatedURL}`))
  })

  sessionWindow.webContents.on('render-process-gone', (_, details) => {
    forceFinishSession(new Error(`Renderer process gone: ${details.reason}`))
  })

  loadRendererPage(sessionWindow, 'sync-session')
    .catch((error) => {
      forceFinishSession(error)
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
