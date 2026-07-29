import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { deleteServer, deleteSyncTask, getMainWindowData, getServer, listOperationHistory, updateGlobalIgnorePatterns } from '#src/app/app-api.js'
import { isValidSyncTaskModal } from '#src/app/main-window/modal-contract.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { createOperationErrorReportState } from '#src/app/operations/operation-report-contract.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'
import { SERVER_OPERATION } from '#src/app/operations/server-operation-contract.js'
import { SYNC_TASK_OPERATION } from '#src/app/operations/task-operation-contract.js'
import { getActiveModalWindow } from '../app-state.js'
import { closeMessageBox, openMessageBox, updateMessageBox } from '../message-box/window.js'
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

async function runReportedOperation(operation, execute) {
  const reporter = createOperationReporter(operation, {
    open: openMessageBox,
    update: updateMessageBox,
    close: closeMessageBox,
  })

  let value
  try {
    value = await execute(reporter.step)
  }
  catch (error) {
    await reporter.error(error)
    return toFailureResult(error)
  }

  await reporter.succeed(true)
  return toSuccessfulResult(value)
}

async function reportRequestError(error) {
  await openMessageBox(createOperationErrorReportState(error))
  return toFailureResult(error)
}

export function createMainWindowHandlers() {
  async function openSyncTaskModalHandler(_event, payload) {
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
      return await reportRequestError(error)
    }
  }

  async function getMainWindowDataHandler(_event) {
    try {
      const result = await getMainWindowData()
      return toSuccessfulResult(result)
    }
    catch (error) {
      return await reportRequestError(error)
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
      return await reportRequestError(error)
    }
  }

  async function getOperationHistoryHandler(_event, payload = {}) {
    try {
      const result = await listOperationHistory({
        limit: payload?.limit,
      })
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function deleteServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    const { serverName } = payload
    return await runReportedOperation(
      SERVER_OPERATION.DELETE,
      onProgress => deleteServer(serverName, onProgress),
    )
  }

  async function deleteSyncTaskHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    return await runReportedOperation(
      SYNC_TASK_OPERATION.DELETE,
      onProgress => deleteSyncTask(payload.task, onProgress),
    )
  }

  async function updateGlobalIgnorePatternsHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      return toSuccessfulResult(await updateGlobalIgnorePatterns(payload.ignorePatterns))
    }
    catch (error) {
      return await reportRequestError(error)
    }
  }

  return {
    getMainWindowDataHandler,
    openSyncTaskModalHandler,
    getServerHandler,
    getOperationHistoryHandler,
    deleteServerHandler,
    deleteSyncTaskHandler,
    updateGlobalIgnorePatternsHandler,
  }
}
