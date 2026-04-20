import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

export function createSessionWindow(options) {
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

  }

  let state = {
    context: {
      mode: '',
      localFolderPath: '',
      remoteFolderPath: '',
      bypassConfig: false,
    },
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
  let pendingReview = null

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

  function sendProgressToRenderer(nextState) {
    state = {
      ...state,
      ...nextState,
    }

    if (!sessionWindow.isDestroyed())
      sessionWindow.webContents.send(channels.progressEvent, nextState)
  }

  function onEventFromCore(event) {
    const nextState = {
      phase: {
        name: event.phase,
        status: event.status,
      },
    }

    if (event.type === 'phase') {
      if (event.message)
        nextState.phase.message = event.message

      if (event.status === 'started') {
        nextState.step = getStepForPhase(nextState.phase.name)
      }
    }
    else if (event.type === 'progress') {
      nextState.progress = {}
      nextState.progress.current = event.current
      nextState.progress.total = event.total
      nextState.progress.message = event.message
    }
    else if (event.type === 'error') {
      nextState.error = {}
      nextState.error.message = event.message
    }

    sendProgressToRenderer(nextState)
  }

  async function reviewDiffInWindow(diffSnapshot) {
    const payload = serializeDiffSnapshot(diffSnapshot)

    sendProgressToRenderer({ review: payload })

    return new Promise((resolve, reject) => {
      pendingReview = {
        resolve,
        reject,
      }
    })
  }

  function settlePendingReview(result, { useReject = false } = {}) {
    if (!pendingReview)
      return

    const { resolve, reject } = pendingReview
    pendingReview = null

    if (useReject) {
      reject(result)
    }
    else {
      resolve(result)
    }
  }

  function handleCancel() {
    settlePendingReview({ action: 'cancel', selectedPaths: [] })
  }

  function handleConfirm(_event, payload) {
    const selectedPaths = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : []
    settlePendingReview({ action: 'confirm', selectedPaths })
  }

  ipcMain.handle(channels.getState, () => state)
  ipcMain.on(channels.cancelSync, handleCancel)
  ipcMain.on(channels.confirmSync, handleConfirm)

  const cleanup = () => {
    ipcMain.removeHandler(channels.getState)
    ipcMain.removeListener(channels.cancelSync, handleCancel)
    ipcMain.removeListener(channels.confirmSync, handleConfirm)
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
    closeWindow,
    updateOptions,
  }
}
