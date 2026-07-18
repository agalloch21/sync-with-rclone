import { APP_ERROR_CODE, getErrorCode, throwAppError } from '../app-errors.js'
import { getProtocolDefinition } from './protocol-registry.js'
import * as rcloneRemotes from './rclone-config.js'

function buildRcloneConfig(protocolType, protocolFields) {
  return { type: protocolType, ...protocolFields }
}

function getRcloneRemoteAddress(remote) {
  const config = remote?.config || {}
  return config?.host || config?.url || config?.remote || config?.endpoint || ''
}

function removePasswordFields(config = {}) {
  const protocol = getProtocolDefinition(config.type)
  if (!protocol)
    return { ...config }

  const passwordFields = new Set(
    protocol.fields
      .filter(field => field.type === 'password')
      .map(field => field.name),
  )

  return Object.fromEntries(
    Object.entries(config).filter(([fieldName]) => !passwordFields.has(fieldName)),
  )
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
    config: removePasswordFields(config),
  }
}

// Layer throw helpers use: (code, message, { cause, detail, fields, meta }).
function throwServerError(code, message, options = {}) {
  const { cause = null, detail = null, fields = null, meta = {} } = options
  throwAppError(code, message, {
    detail: detail ?? cause?.detail,
    fields: fields ?? cause?.fields,
    cause,
    meta,
  })
}

function throwServerErrorFromRclone(error, fallbackMessage, meta = {}) {
  const code = getErrorCode(error)
  if (code === APP_ERROR_CODE.RCLONE_REMOTE_EXISTS) {
    throwServerError(APP_ERROR_CODE.SERVER_ALREADY_EXISTS, 'Server already exists.', { cause: error, meta })
  }

  if (code === APP_ERROR_CODE.RCLONE_REMOTE_MISSING) {
    throwServerError(APP_ERROR_CODE.SERVER_NOT_FOUND, 'Server does not exist.', { cause: error, meta })
  }

  if (code === APP_ERROR_CODE.RCLONE_INVALID_REMOTE) {
    throwServerError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'Server validation failed.', { cause: error, meta })
  }

  throwServerError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, fallbackMessage, { cause: error, meta })
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

export async function getFolderTree(name) {
  try {
    return await rcloneRemotes.getRcloneFolderTree(name)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to list server folders.', { name })
  }
}

export async function listServerConnections() {
  try {
    const remotes = await rcloneRemotes.listRcloneRemotes()
    const servers = remotes.map(remote => rcloneRemoteToServer(remote))
    return servers
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to list servers.')
  }
}

export async function getServerConnection(name) {
  try {
    const remote = await rcloneRemotes.getRcloneRemote(name)
    const server = rcloneRemoteToServer(remote)
    return server
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to get server.', {
      name,
    })
  }
}

export async function testServerConnection(name) {
  try {
    await rcloneRemotes.testRcloneRemoteConnection(name)
  }
  catch (error) {
    throwServerError(APP_ERROR_CODE.SERVER_CONNECTION_FAILED, 'Server connection failed.', {
      cause: error,
      meta: {
        name,
      },
    })
  }
}

export async function createServerConnection(expectedName, protocolType, protocolFields) {
  const config = buildRcloneConfig(protocolType, protocolFields)

  try {
    await rcloneRemotes.createRcloneRemote(expectedName, config)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to create server.', {
      name: expectedName,
    })
  }

  try {
    await rcloneRemotes.testRcloneRemoteConnection(expectedName)
  }
  catch (error) {
    let rollbackError = null
    try {
      await rcloneRemotes.deleteRcloneRemote(expectedName)
    }
    catch (caughtRollbackError) {
      rollbackError = caughtRollbackError
    }
    throwServerError(APP_ERROR_CODE.SERVER_CONNECTION_FAILED, 'Server connection failed.', {
      cause: error,
      detail: error?.detail || 'The server was saved temporarily, but the connection test failed.',
      meta: {
        name: expectedName,
        ...(rollbackError && { rollbackErrorCode: getErrorCode(rollbackError) }),
      },
    })
  }
}

export async function updateServerConnection(name, protocolType, protocolFields) {
  const config = buildRcloneConfig(protocolType, protocolFields)

  try {
    await rcloneRemotes.updateRcloneRemote(name, config)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to update the server.', {
      name,
    })
  }
}

export async function deleteServerConnection(name) {
  try {
    await rcloneRemotes.deleteRcloneRemote(name)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to delete the server.', {
      name,
    })
  }
}

export async function renameServerConnection(name, expectedName, protocolType = null, protocolFields = null) {
  const config = protocolType == null && protocolFields == null
    ? null
    : buildRcloneConfig(protocolType, protocolFields)

  try {
    await rcloneRemotes.renameRcloneRemote(name, expectedName, config)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to rename the server.', {
      name,
      expectedName,
    })
  }
}
