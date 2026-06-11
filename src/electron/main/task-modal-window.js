import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRendererEntry } from './renderer-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createTaskModalWindow(parentWindow, action) {
  const { BrowserWindow, ipcMain } = require('electron')
  const modalState = { action }

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
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/task-modal-preload.cjs'),
      additionalArguments: [JSON.stringify(modalState)],
    },
  })

  function closeModal() {
    if (!modalWindow.isDestroyed())
      modalWindow.close()

    return { success: true }
  }

  ipcMain.handle('task-modal:close', closeModal)

  ipcMain.once('task-modal:ready', (event, payload) => {
    if (!modalWindow.isDestroyed()) {
      modalWindow.setTitle(payload.title)
      modalWindow.show()
    }
  })

  modalWindow.on('closed', () => {
    ipcMain.removeHandler('task-modal:close')
  })

  modalWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[task-modal:${level}] ${message} (${sourceId}:${line})`)
  })

  modalWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Task modal failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererEntry(modalWindow, 'task-modal')
    .catch((error) => {
      console.error(error)
      closeModal()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    modalWindow.webContents.openDevTools({ mode: 'detach' })

  return modalWindow
}
