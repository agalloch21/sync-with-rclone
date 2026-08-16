import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RENDERER_SURFACE } from '#electron/contracts/renderer-surface.js'
import { clearActiveModalWindow, getMainWindow, setActiveModalWindow } from '../app-state.js'
import { destroyFolderDialog } from '../folder-dialog/window.js'
import { loadRendererSurface } from '../load-renderer-surface.js'
import { createMessageBoxBridgeHandlers } from '../message-box/window.js'
import { createFormModalHandlers } from './handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createFormModalWindow(view, context = {}) {
  const { BrowserWindow, ipcMain } = require('electron')
  const parentWindow = getMainWindow()
  const modalState = { view, context }

  const modalWindow = new BrowserWindow({
    width: 600,
    height: 450,
    parent: parentWindow,
    modal: true,
    frame: process.platform !== 'win32',
    show: false,
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/form-modal/index.cjs'),
    },
  })
  setActiveModalWindow(modalWindow)

  const handlers = createFormModalHandlers()
  const messageBoxHandlers = createMessageBoxBridgeHandlers()

  function closeModal() {
    if (!modalWindow.isDestroyed())
      modalWindow.close()
  }

  ipcMain.handle('form-modal:get-state', () => modalState)
  ipcMain.handle('form-modal:close', closeModal)

  ipcMain.handle('form-modal:list-servers', handlers.listServersHandler)
  ipcMain.handle('form-modal:get-server', handlers.getServerHandler)
  ipcMain.handle('form-modal:get-global-exclusion-patterns', handlers.getGlobalExclusionPatternsHandler)
  ipcMain.handle('form-modal:create-server', handlers.createServerHandler)
  ipcMain.handle('form-modal:update-server', handlers.updateServerHandler)
  ipcMain.handle('form-modal:create-mapping', handlers.createMappingHandler)
  ipcMain.handle('form-modal:update-mapping', handlers.updateMappingHandler)
  ipcMain.handle('form-modal:update-mapping-exclusion-patterns', handlers.updateMappingExclusionPatternsHandler)
  ipcMain.handle('form-modal:select-local-folder', handlers.selectLocalFolderHandler)
  ipcMain.handle('form-modal:select-remote-folder', handlers.selectRemoteFolderHandler)
  ipcMain.handle('form-modal:show-message-box', messageBoxHandlers.showMessageBoxHandler)
  ipcMain.handle('form-modal:close-message-box', messageBoxHandlers.closeMessageBoxHandler)

  ipcMain.once('form-modal:ready', (event, payload) => {
    if (!modalWindow.isDestroyed()) {
      modalWindow.setTitle(payload?.title || 'Form')
      modalWindow.show()
    }
  })

  modalWindow.on('closed', () => {
    destroyFolderDialog(modalWindow)
    clearActiveModalWindow(modalWindow)
    ipcMain.removeHandler('form-modal:get-state')
    ipcMain.removeHandler('form-modal:close')
    ipcMain.removeHandler('form-modal:list-servers')
    ipcMain.removeHandler('form-modal:get-server')
    ipcMain.removeHandler('form-modal:get-global-exclusion-patterns')
    ipcMain.removeHandler('form-modal:create-server')
    ipcMain.removeHandler('form-modal:update-server')
    ipcMain.removeHandler('form-modal:create-mapping')
    ipcMain.removeHandler('form-modal:update-mapping')
    ipcMain.removeHandler('form-modal:update-mapping-exclusion-patterns')
    ipcMain.removeHandler('form-modal:select-local-folder')
    ipcMain.removeHandler('form-modal:select-remote-folder')
    ipcMain.removeHandler('form-modal:show-message-box')
    ipcMain.removeHandler('form-modal:close-message-box')
  })

  modalWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[form-modal:${level}] ${message} (${sourceId}:${line})`)
  })

  modalWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Form modal failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererSurface(modalWindow, RENDERER_SURFACE.FORM_MODAL)
    .catch((error) => {
      console.error(error)
      closeModal()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    modalWindow.webContents.openDevTools({ mode: 'detach' })

  return modalWindow
}
