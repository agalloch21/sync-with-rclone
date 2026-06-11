import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidSyncTaskModal } from '#src/app/sync-task/modal-contract.js'
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

  function handleOpenSyncTaskModal(_event, payload) {
    const modalName = payload?.modalName

    if (!isValidSyncTaskModal(modalName))
      return { success: false, reason: 'invalid-modal' }

    if (syncTaskModalWindow && !syncTaskModalWindow.isDestroyed()) {
      syncTaskModalWindow.focus()
      return { success: true, modalName }
    }

    syncTaskModalWindow = createSyncTaskModalWindow(mainWindow, modalName)
    syncTaskModalWindow.once('closed', () => {
      syncTaskModalWindow = null
    })

    return { success: true, modalName }
  }

  ipcMain.handle('main-window:open-sync-task-modal', handleOpenSyncTaskModal)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    ipcMain.removeHandler('main-window:open-sync-task-modal')
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
