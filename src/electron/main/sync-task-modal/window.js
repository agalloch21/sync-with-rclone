import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRcloneRemote, testRcloneRemote } from '#src/app/rclone-config.js'
import { loadRendererEntry } from '../renderer-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createSyncTaskModalHandlers(options = {}) {
  const { appModelAccess = {} } = options

  return {
    async listServers() {
      const result = await appModelAccess.getAppModel?.()
      if (!result?.success)
        return { success: false, servers: [], error: result?.error || 'Failed to load servers.' }

      return { success: true, servers: result.model?.servers || [] }
    },

    async testRemote(_event, payload) {
      return testRcloneRemote(payload?.remoteName)
    },

    async createRemote(_event, payload) {
      const result = await createRcloneRemote(payload)
      if (result.success)
        await appModelAccess.refreshAppModel?.()

      return result
    },
  }
}

export function createSyncTaskModalWindow(parentWindow, modalName, appModelAccess = {}) {
  const { BrowserWindow, ipcMain } = require('electron')
  const modalState = { modalName }
  const handlers = createSyncTaskModalHandlers({ appModelAccess })

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
      additionalArguments: [JSON.stringify(modalState)],
    },
  })

  function closeModal() {
    if (!modalWindow.isDestroyed())
      modalWindow.close()

    return { success: true }
  }

  ipcMain.handle('sync-task-modal:close', closeModal)
  ipcMain.handle('sync-task-modal:list-servers', handlers.listServers)
  ipcMain.handle('sync-task-modal:test-remote', handlers.testRemote)
  ipcMain.handle('sync-task-modal:create-remote', handlers.createRemote)

  ipcMain.once('sync-task-modal:ready', (event, payload) => {
    if (!modalWindow.isDestroyed()) {
      modalWindow.setTitle(payload?.title || 'Sync Task')
      modalWindow.show()
    }
  })

  modalWindow.on('closed', () => {
    ipcMain.removeHandler('sync-task-modal:close')
    ipcMain.removeHandler('sync-task-modal:list-servers')
    ipcMain.removeHandler('sync-task-modal:test-remote')
    ipcMain.removeHandler('sync-task-modal:create-remote')
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
