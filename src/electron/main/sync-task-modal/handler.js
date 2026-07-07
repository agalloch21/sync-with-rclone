import { createServer, getServer, listServers, updateServer } from '#src/app/main-window/app-operations.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'

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
