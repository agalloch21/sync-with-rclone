import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { validateProtocolForm } from './protocol-registry.js'
import * as rcloneRemotes from './rclone-config.js'

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
    const result = await rcloneRemotes.listRcloneRemotes()
    return result
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to list servers.', { cause: error })
  }
}

export async function getServerConnection(serverName) {
  try {
    const name = serverName.trim()
    return await rcloneRemotes.getRcloneRemote(name)
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
  const config = rcloneRemotes.buildRcloneConfig(protocolType, protocolFields)
  try {
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

export async function updateServerConnection(serverName, expectedServerName, protocolType, protocolFields) {
  const validationResult = validateProtocolForm(protocolType, protocolFields)
  if (!validationResult.success) {
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'Server validation failed', {
      detail: validationResult.error?.message,
      fields: validationResult.error?.fields,
    })
  }

  if (serverName.trim() !== expectedServerName.trim()) {
    await renameServerConnection(serverName, expectedServerName)
  }

  try {
    const name = expectedServerName.trim()
    const config = rcloneRemotes.buildRcloneConfig(protocolType, protocolFields)
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

export async function renameServerConnection(currentServerName, expectedServerName) {
  currentServerName = currentServerName.trim()
  expectedServerName = expectedServerName.trim()

  if (currentServerName === expectedServerName)
    return

  try {
    await rcloneRemotes.renameRcloneRemote(currentServerName, expectedServerName)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Failed to rename the server.', { cause: error })
  }
}
