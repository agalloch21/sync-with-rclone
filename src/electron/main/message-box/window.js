import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isMessageBoxResult,
  MESSAGE_BOX_RESULT,
  normalizeMessageBoxState,
} from '#src/app/main-window/message-box-contract.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import {
  clearMessageBoxWindow,
  getMessageBoxParentWindow,
  getMessageBoxWindow,
  setMessageBoxWindow,
} from '../app-state.js'
import { loadRendererEntry } from '../renderer-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function createMessageBoxState(payload = {}) {
  return normalizeMessageBoxState(payload)
}

function createDefaultMessageBoxState() {
  return createMessageBoxState({
    text: {
      message: '',
    },
  })
}

const { BrowserWindow, ipcMain } = require('electron')

let currentState = null
let pendingResolve = null
let closingResult = MESSAGE_BOX_RESULT.CLOSED
let handlersRegistered = false
let readyHandler = null

function resolveMessageBox(result) {
  const resolve = pendingResolve
  pendingResolve = null
  if (resolve)
    resolve(result)
}

function closeWithResult(result) {
  const normalizedResult = isMessageBoxResult(result)
    ? result
    : MESSAGE_BOX_RESULT.CLOSED
  const messageWindow = getMessageBoxWindow()

  if (messageWindow) {
    closingResult = normalizedResult
    messageWindow.close()
  }
  else {
    resolveMessageBox(normalizedResult)
  }
}

function registerHandlers() {
  if (handlersRegistered)
    return

  ipcMain.handle('message-box:get-state', () => currentState || createDefaultMessageBoxState())

  ipcMain.handle('message-box:on-click-confirm', () => {
    closeWithResult(MESSAGE_BOX_RESULT.CONFIRMED)
    return { success: true }
  })

  ipcMain.handle('message-box:on-click-cancel', () => {
    closeWithResult(MESSAGE_BOX_RESULT.CANCELLED)
    return { success: true }
  })

  readyHandler = () => {
    const messageWindow = getMessageBoxWindow()
    if (messageWindow) {
      messageWindow.webContents.send('message-box:set-state', currentState)
      messageWindow.show()
    }
  }
  ipcMain.on('message-box:ready', readyHandler)

  handlersRegistered = true
}

function createWindow() {
  registerHandlers()

  const messageWindow = new BrowserWindow({
    width: 420,
    height: 240,
    parent: getMessageBoxParentWindow(),
    modal: true,
    show: false,
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    resizable: false,
    title: 'Message',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/message-box/index.cjs'),
    },
  })
  setMessageBoxWindow(messageWindow)

  messageWindow.on('closed', () => {
    clearMessageBoxWindow(messageWindow)
    resolveMessageBox(closingResult)
    closingResult = MESSAGE_BOX_RESULT.CLOSED
  })

  messageWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[message-box:${level}] ${message} (${sourceId}:${line})`)
  })

  messageWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Message box failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererEntry(messageWindow, 'message-box')
    .catch((error) => {
      console.error(error)
      if (messageWindow && !messageWindow.isDestroyed())
        messageWindow.close()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    messageWindow.webContents.openDevTools({ mode: 'detach' })
}

export function updateMessageBox(payload = {}) {
  currentState = createMessageBoxState(payload)

  const messageWindow = getMessageBoxWindow()
  if (messageWindow) {
    messageWindow.webContents.send('message-box:set-state', currentState)
    messageWindow.focus()
  }
}

//* ================================ Exported Functions ==============================*/

export function openMessageBox(payload = {}) {
  currentState = createMessageBoxState(payload)

  if (pendingResolve)
    resolveMessageBox(MESSAGE_BOX_RESULT.REPLACED)

  const resultPromise = new Promise((resolve) => {
    pendingResolve = resolve
  })

  if (getMessageBoxWindow()) {
    updateMessageBox(currentState)
    return resultPromise
  }

  createWindow()
  return resultPromise
}

export function closeMessageBox(result = MESSAGE_BOX_RESULT.CLOSED) {
  closeWithResult(result)
}

export function createMessageBoxBridgeHandlers() {
  async function showMessageBoxHandler(_event, payload = {}) {
    try {
      const result = await openMessageBox(payload)
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  function closeMessageBoxHandler(_event, payload = {}) {
    try {
      closeMessageBox(payload.result)
      return toSuccessfulResult()
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  return {
    showMessageBoxHandler,
    closeMessageBoxHandler,
  }
}

export function destroyMessageBox() {
  closeMessageBox()
  if (handlersRegistered) {
    ipcMain.removeHandler('message-box:get-state')
    ipcMain.removeHandler('message-box:on-click-confirm')
    ipcMain.removeHandler('message-box:on-click-cancel')
    if (readyHandler)
      ipcMain.removeListener('message-box:ready', readyHandler)
    handlersRegistered = false
    readyHandler = null
  }
}
