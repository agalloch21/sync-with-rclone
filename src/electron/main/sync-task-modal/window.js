import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clearActiveModalWindow, getMainWindow, setActiveModalWindow } from '../app-state.js'
import { createMessageBoxBridgeHandlers } from '../message-box/window.js'
import { loadRendererEntry } from '../renderer-entry.js'
import { createSyncTaskModalHandlers } from './handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createSyncTaskModalWindow(modalName, context = {}) {
  const { BrowserWindow, ipcMain } = require('electron')
  const parentWindow = getMainWindow()
  const modalState = { modalName, context }

  const modalWindow = new BrowserWindow({
    width: 600,
    height: 450,
    parent: parentWindow,
    modal: true,
    show: false,
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/sync-task-modal/index.cjs'),
    },
  })
  setActiveModalWindow(modalWindow)

  const handlers = createSyncTaskModalHandlers()
  const messageBoxHandlers = createMessageBoxBridgeHandlers()

  function closeModal() {
    if (!modalWindow.isDestroyed())
      modalWindow.close()
  }

  ipcMain.handle('sync-task-modal:get-state', () => modalState)
  ipcMain.handle('sync-task-modal:close', closeModal)

  ipcMain.handle('sync-task-modal:list-servers', handlers.listServersHandler)
  ipcMain.handle('sync-task-modal:get-server', handlers.getServerHandler)
  ipcMain.handle('sync-task-modal:create-server', handlers.createServerHandler)
  ipcMain.handle('sync-task-modal:update-server', handlers.updateServerHandler)
  ipcMain.handle('sync-task-modal:show-message-box', messageBoxHandlers.showMessageBoxHandler)
  ipcMain.handle('sync-task-modal:close-message-box', messageBoxHandlers.closeMessageBoxHandler)

  ipcMain.once('sync-task-modal:ready', (event, payload) => {
    if (!modalWindow.isDestroyed()) {
      modalWindow.setTitle(payload?.title || 'Sync Task')
      modalWindow.show()
    }
  })

  modalWindow.on('closed', () => {
    clearActiveModalWindow(modalWindow)
    ipcMain.removeHandler('sync-task-modal:get-state')
    ipcMain.removeHandler('sync-task-modal:close')
    ipcMain.removeHandler('sync-task-modal:list-servers')
    ipcMain.removeHandler('sync-task-modal:get-server')
    ipcMain.removeHandler('sync-task-modal:create-server')
    ipcMain.removeHandler('sync-task-modal:update-server')
    ipcMain.removeHandler('sync-task-modal:show-message-box')
    ipcMain.removeHandler('sync-task-modal:close-message-box')
  })

  modalWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[sync-task-modal:${level}] ${message} (${sourceId}:${line})`)
  })

  modalWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Task modal failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererEntry(modalWindow, 'sync-task-modal')
    .catch((error) => {
      console.error(error)
      closeModal()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    modalWindow.webContents.openDevTools({ mode: 'detach' })

  return modalWindow
}
