import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidSyncTaskModal } from '#src/app/sync-task/modal-contract.js'
import {
  clearMainWindow,
  getAppModel,
  getCachedAppModelResult,
  refreshAppModel,
  setMainWindow,
} from '../app-state.js'
import { destroyMessageBox } from '../message-box/window.js'
import { loadRendererEntry } from '../renderer-entry.js'
import { createSyncTaskModalWindow } from '../sync-task-modal/window.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createMainWindow() {
  const { BrowserWindow, ipcMain } = require('electron')
  let syncTaskModalWindow = null

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

  function handleOpenSyncTaskModal(_event, payload) {
    const modalName = payload?.modalName
    const context = payload?.context || {}

    if (!isValidSyncTaskModal(modalName))
      return { success: false, reason: 'invalid-modal' }

    if (syncTaskModalWindow && !syncTaskModalWindow.isDestroyed()) {
      syncTaskModalWindow.focus()
      return { success: true, modalName }
    }

    syncTaskModalWindow = createSyncTaskModalWindow(modalName, context)
    syncTaskModalWindow.once('closed', () => {
      syncTaskModalWindow = null
    })

    return { success: true, modalName }
  }

  function notifyAppModelUpdated(result = null) {
    const payload = result || getCachedAppModelResult() || { success: false, error: 'Failed to load app model.' }
    if (!mainWindow.isDestroyed())
      mainWindow.webContents.send('main-window:app-model-updated', payload)
  }

  async function handleRefreshAppModel() {
    const result = await refreshAppModel()
    notifyAppModelUpdated(result)
    return result
  }

  async function handleListSyncTasks() {
    const result = await getAppModel()
    if (!result.success)
      return { success: false, syncTasks: [], error: result.error }

    return { success: true, syncTasks: result.model.syncTasks }
  }

  ipcMain.handle('main-window:open-sync-task-modal', handleOpenSyncTaskModal)
  ipcMain.handle('main-window:get-app-model', getAppModel)
  ipcMain.handle('main-window:list-sync-tasks', handleListSyncTasks)
  ipcMain.handle('main-window:refresh-app-model', handleRefreshAppModel)

  refreshAppModel()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    destroyMessageBox()
    clearMainWindow(mainWindow)
    ipcMain.removeHandler('main-window:open-sync-task-modal')
    ipcMain.removeHandler('main-window:get-app-model')
    ipcMain.removeHandler('main-window:list-sync-tasks')
    ipcMain.removeHandler('main-window:refresh-app-model')
  })

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[main-panel:${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Main panel failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererEntry(mainWindow, 'main-panel')
    .catch((error) => {
      console.error(error)
      if (!mainWindow.isDestroyed())
        mainWindow.close()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    mainWindow.webContents.openDevTools({ mode: 'detach' })

  return mainWindow
}
