import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RENDERER_SURFACE } from '#electron/contracts/renderer-surface.js'
import { registerConfigUpdateListener, unregisterConfigUpdateListener } from '#src/app/events/configuration-events.js'
import { registerOperationHistoryListener, unregisterOperationHistoryListener } from '#src/app/operations/operation-history.js'
import { clearMainWindow, setMainWindow } from '../app-state.js'
import { loadRendererSurface } from '../load-renderer-surface.js'
import { createMessageBoxBridgeHandlers, destroyMessageBox } from '../message-box/window.js'
import { createMainWindowHandlers } from './handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createMainWindow() {
  const { BrowserWindow, ipcMain } = require('electron')

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 640,
    minHeight: 480,
    autoHideMenuBar: true,
    show: false,
    title: 'Sync with rclone',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/main-window/index.cjs'),
    },
  })
  setMainWindow(mainWindow)

  const handlers = createMainWindowHandlers()
  const messageBoxHandlers = createMessageBoxBridgeHandlers()

  registerConfigUpdateListener(refreshMainWindowData)
  registerOperationHistoryListener(publishOperationHistoryUpdate)

  async function refreshMainWindowData() {
    const payload = await handlers.getMainWindowDataHandler()
    try {
      if (!mainWindow.isDestroyed())
        mainWindow.webContents.send('main-window:config-updated', payload)
    }
    catch (error) {
      console.error(error)
    }
  }

  function publishOperationHistoryUpdate(record) {
    try {
      if (!mainWindow.isDestroyed())
        mainWindow.webContents.send('main-window:operation-history-updated', record)
    }
    catch (error) {
      console.error(error)
    }
  }

  ipcMain.handle('main-window:get-data', handlers.getMainWindowDataHandler)
  ipcMain.handle('main-window:get-operation-history', handlers.getOperationHistoryHandler)
  ipcMain.handle('main-window:open-form-modal', handlers.openFormModalHandler)
  ipcMain.handle('main-window:get-server', handlers.getServerHandler)
  ipcMain.handle('main-window:delete-server', handlers.deleteServerHandler)
  ipcMain.handle('main-window:delete-sync-task', handlers.deleteSyncTaskHandler)
  ipcMain.handle('main-window:update-global-ignore-patterns', handlers.updateGlobalIgnorePatternsHandler)
  ipcMain.handle('main-window:show-message-box', messageBoxHandlers.showMessageBoxHandler)
  ipcMain.handle('main-window:close-message-box', messageBoxHandlers.closeMessageBoxHandler)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    destroyMessageBox()
    clearMainWindow(mainWindow)
    unregisterConfigUpdateListener(refreshMainWindowData)
    unregisterOperationHistoryListener(publishOperationHistoryUpdate)

    ipcMain.removeHandler('main-window:get-data')
    ipcMain.removeHandler('main-window:get-operation-history')
    ipcMain.removeHandler('main-window:open-form-modal')
    ipcMain.removeHandler('main-window:get-server')
    ipcMain.removeHandler('main-window:delete-server')
    ipcMain.removeHandler('main-window:delete-sync-task')
    ipcMain.removeHandler('main-window:update-global-ignore-patterns')
    ipcMain.removeHandler('main-window:show-message-box')
    ipcMain.removeHandler('main-window:close-message-box')
  })

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[main-panel:${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Main panel failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererSurface(mainWindow, RENDERER_SURFACE.MAIN_WINDOW)
    .catch((error) => {
      console.error(error)
      if (!mainWindow.isDestroyed())
        mainWindow.close()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    mainWindow.webContents.openDevTools({ mode: 'detach' })

  return mainWindow
}
