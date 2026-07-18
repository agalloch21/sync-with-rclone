import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { deleteServer, deleteSyncTask, getMainWindowData, getServer } from '#src/app/main-window/app-operations.js'
import { isValidSyncTaskModal } from '#src/app/main-window/modal-contract.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { getActiveModalWindow } from '../app-state.js'
import { createSyncTaskModalWindow } from '../sync-task-modal/window.js'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertPayloadObject(payload) {
  if (!isPlainObject(payload)) {
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid IPC payload.', {
      detail: 'The request payload must be an object.',
    })
  }
}

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
      assertPayloadObject(payload)
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
      assertPayloadObject(payload)
      const { serverName } = payload || {}
      const result = await deleteServer(serverName)
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function deleteSyncTaskHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const result = await deleteSyncTask(payload.task)
      return result.success ? toSuccessfulResult() : toFailureResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  return {
    getMainWindowDataHandler,
    openSyncTaskModalHandler,
    getServerHandler,
    deleteServerHandler,
    deleteSyncTaskHandler,
  }
}
