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

  async function listServers() {
    try {
      const result = await windowPreload?.listServers?.()
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult(error)
    }
  }

  async function getServer(serverName) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.showWarningMessage({
        message: 'Name is invalid.',
        detail: 'please specify a valid name.',
      })
      return toFailureResult()
    }

    try {
      const payload = { serverName }
      const result = await windowPreload?.getServer?.(payload)
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult(error)
    }
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

    try {
      const payload = { expectedServerName, protocolType, protocolFields: toPlainObject(protocolFields) }
      const result = await windowPreload?.createServer?.(payload)
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult(error)
    }
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

    try {
      const payload = { serverName, expectedServerName, protocolType, protocolFields: toPlainObject(protocolFields) }
      const result = await windowPreload?.updateServer?.(payload)
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult()
    }
  }

  async function deleteServer(serverName) {
    if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
      await messageBox.showWarningMessage({
        message: 'Server not selected.',
        detail: 'please select a server first.',
      })
      return toFailureResult()
    }

    try {
      const confirmation = await messageBox.showConfirmMessage({
        title: 'Delete Server',
        message: `Delete server "${serverName}"?`,
        detail: 'This removes the rclone remote from the local rclone configuration.',
      })

      if (!confirmation || confirmation.value !== MESSAGE_BOX_RESULT.CONFIRMED)
        return confirmation || toFailureResult()

      const payload = { serverName }
      const result = await windowPreload?.deleteServer?.(payload)
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult()
    }
  }

  return {
    listServers,
    getServer,
    createServer,
    updateServer,
    deleteServer,
  }
}
