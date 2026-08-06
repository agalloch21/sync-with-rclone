import { isValidFormModalView } from '#electron/contracts/form-modal.js'
import { deleteMapping, deleteServer, getMainWindowData, getServer, listOperationHistory, updateGlobalIgnorePatterns } from '#src/app/app-api.js'
import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { MAPPING_OPERATION } from '#src/app/contracts/mapping.js'
import { SERVER_OPERATION } from '#src/app/contracts/server.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { getActiveModalWindow } from '../app-state.js'
import { createFormModalWindow } from '../form-modal/window.js'
import { reportRequestError, runReportedOperation } from '../message-box/operation-presentation.js'

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
  async function openFormModalHandler(_event, payload) {
    const view = payload?.view
    const context = payload?.context || {}

    if (!isValidFormModalView(view)) {
      return toFailureResult({
        message: 'Cannot open the modal window',
        detail: 'Invalid modal name.',
      })
    }

    try {
      const formModalWindow = getActiveModalWindow()
      if (formModalWindow && !formModalWindow.isDestroyed()) {
        formModalWindow.focus()
        return toSuccessfulResult()
      }

      createFormModalWindow(view, context)
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

  async function deleteMappingHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    return await runReportedOperation(
      MAPPING_OPERATION.DELETE,
      onProgress => deleteMapping(payload.mapping, onProgress),
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
    openFormModalHandler,
    getServerHandler,
    getOperationHistoryHandler,
    deleteServerHandler,
    deleteMappingHandler,
    updateGlobalIgnorePatternsHandler,
  }
}
