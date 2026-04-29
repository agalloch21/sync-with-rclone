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
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      pendingFinalAcknowledgement = { resolve, reject }
    })
  }

  function settlePromise(promiseObj, result = '', { useReject = false } = {}) {
    if (!promiseObj)
      return

    const { resolve, reject } = promiseObj

    if (useReject) {
      reject?.(result)
    }
    else {
      resolve?.(result)
      promiseObj.settled = true
    }
  }

  function settlePendingReview(result) {
    settlePromise(pendingReview, result)
  }

  function settleFinalAcknowledgement() {
    settlePromise(pendingFinalAcknowledgement)
  }

  function handleCancel(_event) {
    if (state.step === STEPS.REVIEW) {
      settlePendingReview({ action: 'cancel', selectedPaths: [] })
    }
    else {
      abortSession()
    }
  }

  function handleConfirm(_event, payload) {
    const selectedPaths = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : []
    settlePendingReview({ action: 'confirm', selectedPaths })
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
    cleanup()
    if (pendingReview)
      handleCancel()
    if (!sessionWindow.isDestroyed())
      sessionWindow?.close()
  }

  sessionWindow.on('closed', () => {
    cleanup()
    if (!isClosing && pendingReview) {
      handleCancel()
    }
  })

  sessionWindow.once('ready-to-show', () => {
    sessionWindow.show()
  })

  sessionWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  sessionWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Renderer failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  sessionWindow.webContents.on('render-process-gone', (_, details) => {
    console.error(`Renderer process gone: ${details.reason}`)
  })

  loadRendererPage(sessionWindow, 'sync-session')
    .catch((error) => {
      if (pendingReview) {
        settlePendingReview(error, { useReject: true })
      }
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
