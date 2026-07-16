import { createServer, getServer, listServers, updateServer } from '#src/app/main-window/app-operations.js'
import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'

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

export function createSyncTaskModalHandlers() {
  async function listServersHandler(_event) {
    try {
      const result = await listServers()
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

  async function createServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const { expectedServerName, protocolType, protocolFields } = payload || {}

      await createServer(expectedServerName, protocolType, protocolFields)

      return toSuccessfulResult()
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function updateServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const { serverName, expectedServerName, protocolType, protocolFields } = payload || {}

      await updateServer(serverName, expectedServerName, protocolType, protocolFields)

      return toSuccessfulResult()
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  return {
    listServersHandler,
    getServerHandler,
    createServerHandler,
    updateServerHandler,

  }
}
