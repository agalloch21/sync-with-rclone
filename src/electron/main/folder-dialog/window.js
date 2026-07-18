import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getFolderTree } from '#src/app/main-window/app-operations.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { loadRendererEntry } from '../renderer-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { BrowserWindow, ipcMain } = require('electron')

let activeDialogWindow = null
let activeParentWindow = null
let currentState = null
let pendingResultPromise = null
let pendingResolve = null
let closingResult = null
let handlersRegistered = false
let readyHandler = null

function createFolderDialogState(payload = {}) {
  const request = payload && typeof payload === 'object' ? payload : {}
  return {
    serverName: typeof request.serverName === 'string' ? request.serverName : '',
    currentPath: typeof request.currentPath === 'string' ? request.currentPath : '',
  }
}

function isUsableWindow(window) {
  return window && !window.isDestroyed?.()
}

function resolveFolderDialog(result) {
  const resolve = pendingResolve
  pendingResolve = null
  pendingResultPromise = null
  if (resolve)
    resolve(result)
}

function closeWithResult(result) {
  closingResult = result
  if (isUsableWindow(activeDialogWindow))
    activeDialogWindow.close()
  else
    resolveFolderDialog(result)
}

function registerHandlers() {
  if (handlersRegistered)
    return

  ipcMain.handle('folder-dialog:get-state', () => currentState || createFolderDialogState())
  ipcMain.handle('folder-dialog:list-tree', async () => {
    try {
      return toSuccessfulResult(await getFolderTree(currentState?.serverName))
    }
    catch (error) {
      return toFailureResult(error)
    }
  })
  ipcMain.handle('folder-dialog:confirm', (_event, payload = {}) => {
    if (typeof payload.path !== 'string')
      return toFailureResult(new TypeError('A folder path is required.'))
    closeWithResult(payload.path)
    return toSuccessfulResult()
  })
  ipcMain.handle('folder-dialog:cancel', () => {
    closeWithResult(null)
    return toSuccessfulResult()
  })

  readyHandler = (event) => {
    if (isUsableWindow(activeDialogWindow) && event.sender === activeDialogWindow.webContents)
      activeDialogWindow.show()
  }
  ipcMain.on('folder-dialog:ready', readyHandler)
  handlersRegistered = true
}

function createWindow(parentWindow) {
  registerHandlers()

  const dialogWindow = new BrowserWindow({
    width: 560,
    height: 520,
    parent: parentWindow,
    modal: true,
    show: false,
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    resizable: true,
    title: 'Select Folder',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/folder-dialog/index.cjs'),
    },
  })

  activeDialogWindow = dialogWindow
  activeParentWindow = parentWindow

  dialogWindow.on('closed', () => {
    if (activeDialogWindow === dialogWindow) {
      activeDialogWindow = null
      activeParentWindow = null
    }
    resolveFolderDialog(closingResult)
    closingResult = null
  })

  dialogWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[folder-dialog:${level}] ${message} (${sourceId}:${line})`)
  })

  dialogWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Folder dialog failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererEntry(dialogWindow, 'folder-dialog')
    .catch((error) => {
      console.error(error)
      closeWithResult(null)
    })

  if (process.env.DEBUG_ELECTRON === '1')
    dialogWindow.webContents.openDevTools({ mode: 'detach' })
}

//* ================================ Exported Functions ==============================*/

export function openFolderDialog(parentWindow, payload = {}) {
  currentState = createFolderDialogState(payload)

  if (isUsableWindow(activeDialogWindow)) {
    activeDialogWindow.focus()
    return pendingResultPromise
  }

  const resultPromise = new Promise((resolve) => {
    pendingResolve = resolve
  })
  pendingResultPromise = resultPromise
  createWindow(parentWindow)
  return resultPromise
}

export function closeFolderDialog(parentWindow = null) {
  if (parentWindow && activeParentWindow !== parentWindow)
    return
  closeWithResult(null)
}

export function destroyFolderDialog(parentWindow = null) {
  if (parentWindow && activeParentWindow && activeParentWindow !== parentWindow)
    return

  closeFolderDialog(parentWindow)
  currentState = null

  if (handlersRegistered) {
    ipcMain.removeHandler('folder-dialog:get-state')
    ipcMain.removeHandler('folder-dialog:list-tree')
    ipcMain.removeHandler('folder-dialog:confirm')
    ipcMain.removeHandler('folder-dialog:cancel')
    if (readyHandler)
      ipcMain.removeListener('folder-dialog:ready', readyHandler)
    handlersRegistered = false
    readyHandler = null
  }
}
