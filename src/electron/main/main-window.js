import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidAction } from '#src/app/contract.js'
import { loadRendererEntry } from './renderer-entry.js'
import { createTaskModalWindow } from './task-modal-window.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createMainWindow() {
  const { BrowserWindow, ipcMain } = require('electron')
  let taskModalWindow = null

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
      preload: path.join(__dirname, '../preload/main-panel-preload.cjs'),
    },
  })

  function handleOpenTaskModal(_event, payload) {
    const action = payload?.action

    if (!isValidAction(action))
      return { success: false, reason: 'invalid-action' }

    if (taskModalWindow && !taskModalWindow.isDestroyed()) {
      taskModalWindow.focus()
      return { success: true, action }
    }

    taskModalWindow = createTaskModalWindow(mainWindow, action)
    taskModalWindow.once('closed', () => {
      taskModalWindow = null
    })

    return { success: true, action }
  }

  ipcMain.handle('main-panel:open-task-modal', handleOpenTaskModal)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    ipcMain.removeHandler('main-panel:open-task-modal')
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
