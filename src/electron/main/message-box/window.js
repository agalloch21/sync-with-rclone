import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getMessageBoxParentWindow } from '../app-state.js'
import { loadRendererEntry } from '../renderer-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function normalizeState(options = {}) {
  return {
    mode: options.mode || 'error',
    title: options.title || 'Message',
    message: options.message || '',
    detail: options.detail || '',
    confirmLabel: options.confirmLabel || 'Confirm',
    cancelLabel: options.cancelLabel || 'Cancel',
    okLabel: options.okLabel || 'OK',
    closeOnAction: options.closeOnAction !== false,
  }
}

const { BrowserWindow, ipcMain } = require('electron')

let messageWindow = null
let currentState = null
let pendingResolve = null
let closingAction = 'close'
let handlersRegistered = false
let readyHandler = null
let testActionQueue = null
let testMessages = null

function settle(action) {
  const resolve = pendingResolve
  pendingResolve = null
  if (resolve)
    resolve({ action })
}

function registerHandlers() {
  if (handlersRegistered)
    return

  ipcMain.handle('message-box:get-state', () => currentState || normalizeState())

  ipcMain.handle('message-box:action', (_event, payload) => {
    const action = payload?.action || 'close'
    const shouldClose = currentState?.closeOnAction !== false || action === 'close'

    if (shouldClose && messageWindow && !messageWindow.isDestroyed()) {
      messageWindow.close()
    }
    else {
      settle(action)
    }

    return { success: true, action }
  })

  readyHandler = () => {
    if (messageWindow && !messageWindow.isDestroyed()) {
      messageWindow.webContents.send('message-box:set-state', currentState)
      messageWindow.show()
    }
  }
  ipcMain.on('message-box:ready', readyHandler)

  handlersRegistered = true
}

function createWindow(state) {
  registerHandlers()

  messageWindow = new BrowserWindow({
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
      title: state.title,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/message-box/index.cjs'),
      },
  })

  messageWindow.on('closed', () => {
    messageWindow = null
    settle(closingAction)
    closingAction = 'close'
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
}

export function updateMessageBox(options = {}) {
  currentState = normalizeState({
    ...currentState,
    ...options,
  })

  if (testMessages) {
    testMessages.push(currentState)
    return { success: true }
  }

  if (messageWindow && !messageWindow.isDestroyed()) {
    messageWindow.setTitle(currentState.title)
    messageWindow.webContents.send('message-box:set-state', currentState)
    messageWindow.focus()
  }

  return { success: true }
}

export function openMessageBox(options = {}) {
  currentState = normalizeState(options)

  if (testActionQueue) {
    testMessages.push(currentState)
    return Promise.resolve({ action: testActionQueue.shift() || 'ok' })
  }

  if (pendingResolve)
    settle('replaced')

  const resultPromise = new Promise((resolve) => {
    pendingResolve = resolve
  })

  if (messageWindow && !messageWindow.isDestroyed()) {
    updateMessageBox(currentState)
    return resultPromise
  }

  createWindow(currentState)
  return resultPromise
}

export function closeMessageBox(action = 'close') {
  if (messageWindow && !messageWindow.isDestroyed()) {
    closingAction = action
    messageWindow.close()
  }
  else {
    settle(action)
  }
}

export function getMessageBoxWindow() {
  return messageWindow
}

export function destroyMessageBox() {
  closeMessageBox('close')
  if (handlersRegistered) {
    ipcMain.removeHandler('message-box:get-state')
    ipcMain.removeHandler('message-box:action')
    if (readyHandler)
      ipcMain.removeListener('message-box:ready', readyHandler)
    handlersRegistered = false
    readyHandler = null
  }
}

export function resetMessageBoxForTest() {
  messageWindow = null
  currentState = null
  pendingResolve = null
  closingAction = 'close'
  testActionQueue = null
  testMessages = null
}

export function setMessageBoxTestActions(actions = []) {
  testActionQueue = [...actions]
  testMessages = []
}

export function getMessageBoxTestMessages() {
  return testMessages ? [...testMessages] : []
}
