import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { validateProtocolForm } from './protocol-registry.js'
import * as rcloneRemotes from './rclone-config.js'

function getRcloneRemoteAddress(remote) {
  const config = remote?.config || {}
  return config?.host || config?.url || config?.remote || config?.endpoint || ''
}

function buildRcloneConfig(protocolType, protocolFields) {
  return { type: protocolType, ...protocolFields }
}

function serverToRcloneRemote(server) {
  if (!server)
    return null

  return {
    name: server.name,
    config: server.config,
  }
}

function rcloneRemoteToServer(remote) {
  if (!remote)
    return null

  const { name, config } = remote
  return {
    name,
    type: config.type,
    address: getRcloneRemoteAddress(remote),
    status: 'unknown',
    config,
  }
}

export function buildEmptyServerObject(name) {
  return {
    name,
    type: null,
    address: '',
    status: 'unknown',
    config: null,
  }
}

export async function listServerConnections() {
  try {
    const remotes = await rcloneRemotes.listRcloneRemotes()
    const servers = remotes.map(remote => rcloneRemoteToServer(remote))
    return servers
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to list servers.', { cause: error })
  }
}

export async function getServerConnection(serverName) {
  try {
    const name = serverName.trim()
    const remote = await rcloneRemotes.getRcloneRemote(name)
    const server = rcloneRemoteToServer(remote)
    return server
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to get server.', { cause: error })
  }
}

export async function testServerConnection(serverName) {
  try {
    const name = serverName.trim()
    await rcloneRemotes.testRcloneRemoteConnection(name)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to test server.', { cause: error })
  }
}

export async function createServerConnection(expectedServerName, protocolType, protocolFields) {
  const validationResult = validateProtocolForm(protocolType, protocolFields)
  if (!validationResult.success) {
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'Server validation failed', {
      detail: validationResult.error?.message,
      fields: validationResult.error?.fields,
    })
  }

  const name = expectedServerName.trim()
  try {
    const config = buildRcloneConfig(protocolType, protocolFields)
    await rcloneRemotes.createRcloneRemote(name, config)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to create server.', { cause: error })
  }

  try {
    await rcloneRemotes.testRcloneRemoteConnection(name)
  }
  catch (error) {
    await rcloneRemotes.deleteRcloneRemote(name)
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Targeted server is not reachable.', { cause: error })
  }
}

export async function updateServerConnection(serverName, protocolType, protocolFields) {
  const validationResult = validateProtocolForm(protocolType, protocolFields)
  if (!validationResult.success) {
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'Server validation failed', {
      detail: validationResult.error?.message,
      fields: validationResult.error?.fields,
    })
  }

  try {
    const name = serverName.trim()
    const config = buildRcloneConfig(protocolType, protocolFields)
    await rcloneRemotes.updateRcloneRemote(name, config)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to update the server.', { cause: error })
  }
}

export async function deleteServerConnection(serverName) {
  try {
    const name = serverName.trim()
    await rcloneRemotes.deleteRcloneRemote(name)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to delete the server.', { cause: error })
  }
}

// export async function renameServerConnection(currentServerName, expectedServerName) {
//   currentServerName = currentServerName.trim()
//   expectedServerName = expectedServerName.trim()

//   if (currentServerName === expectedServerName)
//     return

//   try {
//     await rcloneRemotes.renameRcloneRemote(currentServerName, expectedServerName)
//   }
//   catch (error) {
//     throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to rename the server.', { cause: error })
//   }
// }

export async function renameServerConnection(serverName, expectedServerName, protocolType = null, protocolFields = null) {
  serverName = serverName.trim()
  expectedServerName = expectedServerName.trim()

  if (serverName === expectedServerName)
    return

  let config = null
  if (protocolType && protocolFields) {
    const validationResult = validateProtocolForm(protocolType, protocolFields)
    if (!validationResult.success) {
      throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'Server validation failed.', {
        detail: validationResult.error?.message,
        fields: validationResult.error?.fields,
      })
    }
    config = buildRcloneConfig(protocolType, protocolFields)
  }
  else {
    const server = await getServerConnection(serverName)
    const remote = serverToRcloneRemote(server)
    if (!remote || !remote.config) {
      throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, `Server ${serverName} does not exist.`)
    }
    config = remote.config
  }

  try {
    await rcloneRemotes.createRcloneRemote(expectedServerName, config)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to rename the server.', { cause: error })
  }

  try {
    await rcloneRemotes.deleteRcloneRemote(serverName)
  }
  catch (error) {
    try {
      await rcloneRemotes.deleteRcloneRemote(expectedServerName)
    }
    catch {}

    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to rename the server.', { cause: error })
  }
}
