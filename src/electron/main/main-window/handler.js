import { deleteServer, getMainWindowData, getServer } from '#src/app/main-window/app-operations.js'
import { isValidSyncTaskModal } from '#src/app/main-window/modal-contract.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { getActiveModalWindow } from '../app-state.js'
import { createSyncTaskModalWindow } from '../sync-task-modal/window.js'

export function createMainWindowHandlers() {
  function openSyncTaskModalHandler(_event, payload) {
    const modalName = payload?.modalName
    const context = payload?.context || {}

    if (!isValidSyncTaskModal(modalName)) {
      return toFailureResult({
        message: 'Cannot open the modal window',
        detail: 'Invalid modal name.',
      })
    }

    try {
      const syncTaskModalWindow = getActiveModalWindow()
      if (syncTaskModalWindow && !syncTaskModalWindow.isDestroyed()) {
        syncTaskModalWindow.focus()
        return toSuccessfulResult()
      }

      createSyncTaskModalWindow(modalName, context)
      return toSuccessfulResult()
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function getMainWindowDataHandler(_event) {
    try {
      const result = await getMainWindowData()
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function getServerHandler(_event, payload) {
    try {
      const { serverName } = payload || {}
      const result = await getServer(serverName)
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function deleteServerHandler(_event, payload) {
    try {
      const { serverName } = payload || {}
      const result = await deleteServer(serverName)
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function deleteSyncTaskHandler(_event, payload) {

  }

  // async deleteSyncTaskHandler(_event, payload) {
  //   const taskLabel = payload?.displayName || payload?.localBasePath || 'selected task'
  //   const action = await openMessageBox({
  //     mode: 'confirm',
  //     title: 'Delete Sync Task',
  //     message: `Delete task "${taskLabel}"?`,
  //     detail: 'This removes the task from config.json. It does not delete local or remote files.',
  //     confirmLabel: 'Delete',
  //     cancelLabel: 'Cancel',
  //   })
  //   if (action.action !== 'confirm')
  //     return { success: true, action: 'cancelled' }

  //   const taskReference = {
  //     rcloneRemote: payload?.rcloneRemote,
  //     localBasePath: payload?.localBasePath,
  //   }
  //   const result = await deleteTaskFromConfig(taskReference)
  //   if (!result.success) {
  //     await openMessageBox({
  //       mode: 'error',
  //       title: 'Delete Failed',
  //       message: `Could not delete "${taskLabel}".`,
  //       detail: result.detail || result.message || 'Failed to update config.json.',
  //       okLabel: 'OK',
  //     })
  //     return result
  //   }

  //   await refreshAndNotifyAppModel()
  //   await openMessageBox({
  //     mode: 'success',
  //     title: 'Task Deleted',
  //     message: `Deleted "${taskLabel}".`,
  //     okLabel: 'OK',
  //   })
  //   return result
  // },

  return {
    getMainWindowDataHandler,
    openSyncTaskModalHandler,
    getServerHandler,
    deleteServerHandler,
    deleteSyncTaskHandler,
  }
}
