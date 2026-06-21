import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRcloneRemoteFromServer } from '#src/app/app-model.js'
import { isValidSyncTaskModal, SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import {
  checkRemoteDeletion,
  deleteRemoteConfig,
} from '#src/app/sync-task/server-operations.js'
import { deleteTaskFromConfig } from '#src/app/sync-task/task-operations.js'
import {
  clearMainWindow,
  getAppModel,
  getCachedAppModelResult,
  refreshAppModel,
  setMainWindow,
} from '../app-state.js'
import { closeMessageBox, destroyMessageBox, openMessageBox } from '../message-box/window.js'
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

  function createSyncTaskModalContext(modalName, context = {}) {
    if (modalName !== SYNC_TASK_MODALS.EDIT_SERVER)
      return context

    return {
      ...context,
      remote: createRcloneRemoteFromServer(context.server),
    }
  }

  function handleOpenSyncTaskModal(_event, payload) {
    const modalName = payload?.modalName
    const context = createSyncTaskModalContext(modalName, payload?.context || {})

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

  async function handleDeleteRemote(_event, payload) {
    const remoteName = payload?.remoteName
    const modelResult = await getAppModel()
    if (!modelResult?.success) {
      return {
        success: false,
        code: 'app_model.load_failed',
        message: 'Failed to load sync tasks.',
        detail: modelResult?.error || 'Failed to load app model.',
      }
    }

    const deletionCheck = checkRemoteDeletion(modelResult.model, remoteName)
    if (!deletionCheck.success) {
      await openMessageBox({
        mode: 'error',
        title: 'Server Is Still Used',
        message: `Cannot delete "${remoteName}".`,
        detail: deletionCheck.detail,
        okLabel: 'OK',
      })
      return deletionCheck
    }

    const action = await openMessageBox({
      mode: 'confirm',
      title: 'Delete Server',
      message: `Delete server "${remoteName}"?`,
      detail: 'This removes the rclone remote from the local rclone configuration.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    if (action.action !== 'confirm')
      return { success: true, action: 'cancelled' }

    const result = await deleteRemoteConfig(remoteName)
    if (!result.success) {
      await openMessageBox({
        mode: 'error',
        title: 'Delete Failed',
        message: `Could not delete "${remoteName}".`,
        detail: result.detail || result.message || 'Unknown rclone error.',
        okLabel: 'OK',
      })
      return result
    }

    const appModelResult = await refreshAppModel()
    notifyAppModelUpdated(appModelResult)
    await openMessageBox({
      mode: 'success',
      title: 'Server Deleted',
      message: `Deleted "${remoteName}".`,
      okLabel: 'OK',
    })
    return result
  }

  async function handleDeleteSyncTask(_event, payload) {
    const taskLabel = payload?.displayName || payload?.localBasePath || 'selected task'
    const action = await openMessageBox({
      mode: 'confirm',
      title: 'Delete Sync Task',
      message: `Delete task "${taskLabel}"?`,
      detail: 'This removes the task from config.json. It does not delete local or remote files.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    if (action.action !== 'confirm')
      return { success: true, action: 'cancelled' }

    const taskReference = {
      rcloneRemote: payload?.rcloneRemote,
      localBasePath: payload?.localBasePath,
    }
    const result = await deleteTaskFromConfig(taskReference)
    if (!result.success) {
      await openMessageBox({
        mode: 'error',
        title: 'Delete Failed',
        message: `Could not delete "${taskLabel}".`,
        detail: result.detail || result.message || 'Failed to update config.json.',
        okLabel: 'OK',
      })
      return result
    }

    const appModelResult = await refreshAppModel()
    notifyAppModelUpdated(appModelResult)
    await openMessageBox({
      mode: 'success',
      title: 'Task Deleted',
      message: `Deleted "${taskLabel}".`,
      okLabel: 'OK',
    })
    return result
  }

  function handleShowMessageBox(_event, options = {}) {
    return openMessageBox(options)
  }

  function handleCloseMessageBox(_event, payload = {}) {
    closeMessageBox(payload.action || 'close')
    return { success: true }
  }

  ipcMain.handle('main-window:open-sync-task-modal', handleOpenSyncTaskModal)
  ipcMain.handle('main-window:get-app-model', getAppModel)
  ipcMain.handle('main-window:list-sync-tasks', handleListSyncTasks)
  ipcMain.handle('main-window:refresh-app-model', handleRefreshAppModel)
  ipcMain.handle('main-window:delete-remote', handleDeleteRemote)
  ipcMain.handle('main-window:delete-sync-task', handleDeleteSyncTask)
  ipcMain.handle('main-window:show-message-box', handleShowMessageBox)
  ipcMain.handle('main-window:close-message-box', handleCloseMessageBox)

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
    ipcMain.removeHandler('main-window:delete-remote')
    ipcMain.removeHandler('main-window:delete-sync-task')
    ipcMain.removeHandler('main-window:show-message-box')
    ipcMain.removeHandler('main-window:close-message-box')
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
