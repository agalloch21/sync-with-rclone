import { validateProtocolForm } from '#src/app/configuration/protocol-registry.js'
import { toFailureResult, unwrapResult } from '#src/app/operation-result.js'
import { useMessageBox } from './useMessageBox'

export function useServerOperations(windowPreload) {
  const messageBox = useMessageBox(windowPreload)

  function formatErrorFields(fields = {}) {
    return Object.values(fields)
      .filter(Boolean)
      .join('\n')
  }

  async function listServers() {
    try {
      const result = await windowPreload?.listServers?.()
      if (!result?.success) {
        await messageBox.showWarningMessage({
          message: result?.error?.message,
          detail: result?.error?.detail,
        })
      }
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
      if (!result?.success) {
        await messageBox.showWarningMessage({
          message: result?.error?.message,
          detail: result?.error?.detail,
        })
      }
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
      const payload = { serverName: expectedServerName }
      const result = await windowPreload?.getServer?.(payload)
      const hasServer = result.success && unwrapResult(result)
      if (hasServer) {
        await messageBox.showWarningMessage({
          message: `Server ${expectedServerName} already exists.`,
          detail: 'Please specify another name.',
        })
        return toFailureResult()
      }
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult()
    }

    try {
      const payload = { expectedServerName, protocolType, protocolFields }
      const result = await windowPreload?.createServer?.(payload)
      if (!result?.success) {
        await messageBox.showWarningMessage({
          message: result?.error?.message,
          detail: result?.error?.detail,
        })
      }
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
      const payload = { serverName }
      const result = await windowPreload?.getServer?.(payload)
      const serverNotExist = (result.success === false || !unwrapResult(result))
      if (serverNotExist) {
        await messageBox.showWarningMessage({
          message: `Server ${serverName} does not exist.`,
          detail: 'please specify another server.',
        })
        return toFailureResult()
      }
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult(error)
    }

    try {
      const payload = { serverName, expectedServerName, protocolType, protocolFields }
      const result = await windowPreload?.updateServer?.(payload)
      if (!result?.success) {
        await messageBox.showWarningMessage({
          message: result?.error?.message,
          detail: result?.error?.detail,
        })
      }
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
      const payload = { serverName }
      const result = await windowPreload?.getServer?.(payload)
      const serverNotExist = (result.success === false || !unwrapResult(result))
      if (serverNotExist) {
        await messageBox.showWarningMessage({
          message: `Server ${serverName} does not exist.`,
          detail: 'please specify another server.',
        })
        return toFailureResult()
      }
    }
    catch (error) {
      await messageBox.showErrorMessage({
        message: `Something wrong when executing IPC functions.`,
        detail: error?.message,
      })
      return toFailureResult(error)
    }

    try {
      const payload = { serverName }
      const result = await windowPreload?.deleteServer?.(payload)
      if (!result?.success) {
        await messageBox.showWarningMessage({
          message: result?.error?.message,
          detail: result?.error?.detail,
        })
      }
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
