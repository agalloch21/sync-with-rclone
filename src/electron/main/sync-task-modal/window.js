import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRuntimePaths } from '#src/app/runtime-paths.js'
import {
  createRemoteConfig,
  deleteRemoteConfig,
  findTasksUsingRemote,
  testRemoteConnection,
  updateRemoteConfig,
} from '#src/app/sync-task/server-operations.js'
import { deleteTaskFromConfig } from '#src/app/sync-task/task-operations.js'
import {
  clearActiveModalWindow,
  getAppModel,
  getMainWindow,
  refreshAppModel,
  setActiveModalWindow,
} from '../app-state.js'
import { closeMessageBox, openMessageBox } from '../message-box/window.js'
import { loadRendererEntry } from '../renderer-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export function createSyncTaskModalHandlers() {
  async function refreshAndNotifyAppModel() {
    const result = await refreshAppModel()
    const mainWindow = getMainWindow()
    if (mainWindow)
      mainWindow.webContents.send('main-window:app-model-updated', result)
    return result
  }

  return {
    async listServers() {
      const result = await getAppModel()
      if (!result?.success) {
        return {
          success: false,
          code: 'app_model.load_failed',
          message: 'Failed to load servers.',
          detail: result?.error || 'Failed to load app model.',
          servers: [],
        }
      }

      return { success: true, servers: result.model?.servers || [] }
    },

    async testRemote(_event, payload) {
      return testRemoteConnection(payload?.remoteName)
    },

    async createRemote(_event, payload) {
      const result = await createRemoteConfig(payload, getRuntimePaths())
      if (result.success)
        await refreshAndNotifyAppModel()

      return result
    },

    async updateRemote(_event, payload) {
      const result = await updateRemoteConfig(payload, getRuntimePaths())
      if (result.success)
        await refreshAndNotifyAppModel()
      return result
    },

    async deleteRemote(_event, payload) {
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

      const referencedTasks = findTasksUsingRemote(modelResult.model, remoteName)
      if (referencedTasks.length > 0) {
        await openMessageBox({
          mode: 'error',
          title: 'Server Is Still Used',
          message: `Cannot delete "${remoteName}".`,
          detail: `This server is used by ${referencedTasks.length} sync task(s). Delete or move those tasks first.`,
          okLabel: 'OK',
        })
        return {
          success: false,
          code: 'server.in_use',
          message: 'Server is still used by sync tasks.',
          detail: `This server is used by ${referencedTasks.length} sync task(s). Delete or move those tasks first.`,
        }
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

      await refreshAndNotifyAppModel()
      await openMessageBox({
        mode: 'success',
        title: 'Server Deleted',
        message: `Deleted "${remoteName}".`,
        okLabel: 'OK',
      })
      return result
    },

    async deleteSyncTask(_event, payload) {
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

      await refreshAndNotifyAppModel()
      await openMessageBox({
        mode: 'success',
        title: 'Task Deleted',
        message: `Deleted "${taskLabel}".`,
        okLabel: 'OK',
      })
      return result
    },
  }
}

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

  function closeModal() {
    if (!modalWindow.isDestroyed())
      modalWindow.close()

    return { success: true }
  }

  function handleShowMessageBox(_event, options = {}) {
    return openMessageBox(options)
  }

  function handleCloseMessageBox(_event, payload = {}) {
    closeMessageBox(payload.action || 'close')
    return { success: true }
  }

  ipcMain.handle('sync-task-modal:close', closeModal)
  ipcMain.handle('sync-task-modal:get-state', () => modalState)
  ipcMain.handle('sync-task-modal:list-servers', handlers.listServers)
  ipcMain.handle('sync-task-modal:test-remote', handlers.testRemote)
  ipcMain.handle('sync-task-modal:create-remote', handlers.createRemote)
  ipcMain.handle('sync-task-modal:update-remote', handlers.updateRemote)
  ipcMain.handle('sync-task-modal:delete-remote', handlers.deleteRemote)
  ipcMain.handle('sync-task-modal:delete-sync-task', handlers.deleteSyncTask)
  ipcMain.handle('sync-task-modal:show-message-box', handleShowMessageBox)
  ipcMain.handle('sync-task-modal:close-message-box', handleCloseMessageBox)

  ipcMain.once('sync-task-modal:ready', (event, payload) => {
    if (!modalWindow.isDestroyed()) {
      modalWindow.setTitle(payload?.title || 'Sync Task')
      modalWindow.show()
    }
  })

  modalWindow.on('closed', () => {
    clearActiveModalWindow(modalWindow)
    ipcMain.removeHandler('sync-task-modal:close')
    ipcMain.removeHandler('sync-task-modal:get-state')
    ipcMain.removeHandler('sync-task-modal:list-servers')
    ipcMain.removeHandler('sync-task-modal:test-remote')
    ipcMain.removeHandler('sync-task-modal:create-remote')
    ipcMain.removeHandler('sync-task-modal:update-remote')
    ipcMain.removeHandler('sync-task-modal:delete-remote')
    ipcMain.removeHandler('sync-task-modal:delete-sync-task')
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
