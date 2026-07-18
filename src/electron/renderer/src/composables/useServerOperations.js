import { validateProtocolForm } from '#src/app/configuration/protocol-registry.js'
import { MESSAGE_BOX_RESULT } from '#src/app/main-window/message-box-contract.js'
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
    await messageBox.showWarningMessage({
      message: result?.error?.message,
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
      await messageBox.showErrorMessage({
        message: 'Something wrong when executing IPC functions.',
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
      await messageBox.showWarningMessage({
        message: 'Name is invalid.',
        detail: 'please specify a valid name.',
      })
      return toFailureResult()
    }

    const payload = { serverName }
    return await invokeOperation(() => windowPreload?.getServer?.(payload))
  }

  async function createServer(expectedServerName, protocolType, protocolFields) {
    if (!expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0) {
      await messageBox.showWarningMessage({
        message: 'Name is invalid.',
        detail: 'please specify a valid name.',
      })
      return toFailureResult()
    }

    const validationResult = validateProtocolForm(protocolType, protocolFields)
    if (validationResult.success === false) {
      await messageBox.showWarningMessage({
        message: 'Some fields are invalid.',
        detail: formatErrorFields(validationResult.error?.fields),
      })
      return toFailureResult()
    }

    const payload = { expectedServerName, protocolType, protocolFields: toPlainObject(protocolFields) }
    return await invokeOperation(() => windowPreload?.createServer?.(payload))
  }

  async function updateServer(serverName, expectedServerName, protocolType, protocolFields) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.showWarningMessage({
        message: 'Server not selected.',
        detail: 'please select a server first.',
      })
      return toFailureResult()
    }

    if (!expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0) {
      await messageBox.showWarningMessage({
        message: 'Name is invalid.',
        detail: 'please specify a valid name.',
      })
      return toFailureResult()
    }

    const validationResult = validateProtocolForm(protocolType, protocolFields)
    if (validationResult.success === false) {
      await messageBox.showWarningMessage({
        message: 'Some fields are invalid.',
        detail: formatErrorFields(validationResult.error?.fields),
      })
      return toFailureResult()
    }

    const payload = { serverName, expectedServerName, protocolType, protocolFields: toPlainObject(protocolFields) }
    return await invokeOperation(() => windowPreload?.updateServer?.(payload))
  }

  async function deleteServer(serverName) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.showWarningMessage({
        message: 'Server not selected.',
        detail: 'please select a server first.',
      })
      return toFailureResult()
    }

    let confirmation
    try {
      confirmation = await messageBox.showConfirmMessage({
        title: 'Delete Server',
        message: `Delete server "${serverName}"?`,
        detail: 'This removes the rclone remote from the local rclone configuration.',
      })
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: 'Something wrong when executing IPC functions.',
        detail: error?.message,
      })
      return toFailureResult(error)
    }

    if (!confirmation || confirmation.value !== MESSAGE_BOX_RESULT.CONFIRMED)
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
