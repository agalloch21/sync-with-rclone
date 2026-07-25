import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { validateProtocolForm } from '#src/app/configuration/protocol-registry.js'
import { OPERATION_REPORT_ACKNOWLEDGEMENT } from '#src/app/operation-report-contract.js'
import { toFailureResult } from '#src/app/operation-result.js'
import { toRaw } from 'vue'
import { useMessageBox } from './useMessageBox.js'

export function useServerOperations(windowPreload) {
  const messageBox = useMessageBox(windowPreload)

  function formatErrorFields(fields = {}) {
    return Object.values(fields)
      .filter(Boolean)
      .join('\n')
  }

  function getErrorDetail(error = {}) {
    return formatErrorFields(error.fields) || error.detail
  }

  function toPlainObject(value) {
    return structuredClone(toRaw(value || {}))
  }

  async function showOperationWarning(result) {
    await messageBox.error({
      ...result?.error,
      code: result?.error?.code || APP_ERROR_CODE.UNKNOWN,
      detail: getErrorDetail(result?.error),
    })
  }

  async function invokeOperation(operation) {
    try {
      const result = await operation()
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.error({
        code: APP_ERROR_CODE.IPC_UNAVAILABLE,
        detail: error?.message,
      })
      return toFailureResult(error)
    }
  }

  async function invokeMainManagedOperation(operation) {
    try {
      return await operation()
    }
    catch (error) {
      await messageBox.error({
        code: APP_ERROR_CODE.IPC_UNAVAILABLE,
        detail: error?.message,
      })
      return toFailureResult(error)
    }
  }

  async function listServers() {
    return await invokeOperation(() => windowPreload?.listServers?.())
  }

  async function getServer(serverName) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_NAME_INVALID)
      return toFailureResult()
    }

    const payload = { serverName }
    return await invokeOperation(() => windowPreload?.getServer?.(payload))
  }

  async function createServer(expectedServerName, protocolType, protocolFields) {
    if (!expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_NAME_INVALID)
      return toFailureResult()
    }

    const validationResult = validateProtocolForm(protocolType, protocolFields)
    if (validationResult.success === false) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_PROTOCOL_FIELDS_INVALID, {
        detail: formatErrorFields(validationResult.error?.fields),
      })
      return toFailureResult()
    }

    const payload = { expectedServerName, protocolType, protocolFields: toPlainObject(protocolFields) }
    return await invokeMainManagedOperation(() => windowPreload?.createServer?.(payload))
  }

  async function updateServer(serverName, expectedServerName, protocolType, protocolFields) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_SELECTION_REQUIRED)
      return toFailureResult()
    }

    if (!expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_NAME_INVALID)
      return toFailureResult()
    }

    const validationResult = validateProtocolForm(protocolType, protocolFields)
    if (validationResult.success === false) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_PROTOCOL_FIELDS_INVALID, {
        detail: formatErrorFields(validationResult.error?.fields),
      })
      return toFailureResult()
    }

    const payload = { serverName, expectedServerName, protocolType, protocolFields: toPlainObject(protocolFields) }
    return await invokeOperation(() => windowPreload?.updateServer?.(payload))
  }

  async function deleteServer(serverName) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.SERVER_SELECTION_REQUIRED)
      return toFailureResult()
    }

    let confirmation
    try {
      confirmation = await messageBox.confirm(APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION, {
        params: { serverName },
      })
    }
    catch (error) {
      await messageBox.error({
        code: APP_ERROR_CODE.IPC_UNAVAILABLE,
        detail: error?.message,
      })
      return toFailureResult(error)
    }

    if (!confirmation || confirmation.value !== OPERATION_REPORT_ACKNOWLEDGEMENT.CONFIRMED)
      return confirmation || toFailureResult()

    const payload = { serverName }
    return await invokeOperation(() => windowPreload?.deleteServer?.(payload))
  }

  return {
    listServers,
    getServer,
    createServer,
    updateServer,
    deleteServer,
  }
}
