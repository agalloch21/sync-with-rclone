import * as remoteConfig from '#src/infrastructure/rclone/remote-config.js'
import { listRemoteFolders } from '#src/infrastructure/rclone/remote-files.js'
import { APP_ERROR_CODE, getErrorCode, throwAppError } from '../app-errors.js'
import { getProtocolDefinition, validateProtocolForm } from '../configuration/protocol-registry.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_DELETE_PROGRESS_STEP,
  SERVER_UPDATE_PROGRESS_STEP,
} from './server-operation-contract.js'

function throwInvalidRemote(detail, fields = null, meta = {}) {
  throwAppError(APP_ERROR_CODE.RCLONE_INVALID_REMOTE, 'Invalid rclone remote.', {
    detail,
    fields,
    meta,
  })
}

function assertName(name, fieldName = 'name') {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throwInvalidRemote('Name is required.', {
      [fieldName]: 'Name is required.',
    })
  }
}

function prefixedProtocolFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [`config.${key}`, value]))
}

function assertRemoteConfig(config, meta = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throwInvalidRemote('Protocol configuration is required.', {
      config: 'Protocol configuration is required.',
    }, meta)
  }

  const { type, ...fields } = config
  if (!type || typeof type !== 'string') {
    throwInvalidRemote('Protocol type is required.', {
      'config.type': 'Protocol type is required.',
    }, meta)
  }

  const protocol = getProtocolDefinition(type)
  if (!protocol) {
    throwInvalidRemote('Unsupported protocol.', {
      'config.type': 'Unsupported protocol.',
    }, {
      ...meta,
      protocolType: type,
    })
  }

  const validation = validateProtocolForm(type, fields)
  if (!validation.success) {
    throwInvalidRemote('Invalid protocol configuration.', prefixedProtocolFields(validation.error?.fields), {
      ...meta,
      protocolType: type,
    })
  }
}

function normalizeRemoteConfig(config) {
  const { type, ...fields } = config
  const protocol = getProtocolDefinition(type)
  const normalizedFields = Object.fromEntries(protocol.fields.map((field) => {
    const rawValue = fields[field.name]
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    return [field.name, field.type === 'number' ? Number(value) : value]
  }))

  return { type, ...normalizedFields }
}

function buildRcloneConfig(protocolType, protocolFields) {
  const config = { type: protocolType, ...protocolFields }
  assertRemoteConfig(config)
  return normalizeRemoteConfig(config)
}

function normalizeName(name, fieldName = 'name') {
  assertName(name, fieldName)
  return name.trim()
}

function findRemote(remotes, name) {
  return remotes.find(remote => remote.name === name) || null
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
  if (code.startsWith('server.'))
    throw error

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

export async function getFolderTree(name, folderPath = '') {
  const serverName = normalizeName(name)
  try {
    return await listRemoteFolders(serverName, folderPath)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to list server folders.', { name, folderPath })
  }
}

export async function listServerConnections() {
  try {
    const remotes = await remoteConfig.listRemoteConfigs()
    const servers = remotes.map(remote => rcloneRemoteToServer(remote))
    return servers
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to list servers.')
  }
}

export async function getServerConnection(name) {
  const normalizedName = normalizeName(name)
  try {
    const remotes = await remoteConfig.listRemoteConfigs()
    const remote = findRemote(remotes, normalizedName)
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
  const normalizedName = normalizeName(name)
  try {
    await remoteConfig.testRemoteConfig(normalizedName)
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

export async function createServerConnection(expectedName, protocolType, protocolFields, onProgress) {
  try {
    onProgress?.(SERVER_CREATE_PROGRESS_STEP.SAVE)
    const normalizedName = normalizeName(expectedName)
    const config = buildRcloneConfig(protocolType, protocolFields)
    const remotes = await remoteConfig.listRemoteConfigs()
    if (findRemote(remotes, normalizedName)) {
      throwServerError(APP_ERROR_CODE.SERVER_ALREADY_EXISTS, 'Server already exists.', {
        meta: { name: normalizedName },
      })
    }

    await remoteConfig.createRemoteConfig(normalizedName, config)
    expectedName = normalizedName
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to create server.', {
      name: expectedName,
    })
  }

  try {
    onProgress?.(SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION)
    await remoteConfig.testRemoteConfig(expectedName)
  }
  catch (error) {
    let rollbackError = null
    try {
      onProgress?.(SERVER_CREATE_PROGRESS_STEP.ROLLBACK)
      await remoteConfig.deleteRemoteConfig(expectedName)
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

export async function updateServerConnection(name, protocolType, protocolFields, onProgress) {
  try {
    onProgress?.(SERVER_UPDATE_PROGRESS_STEP.SAVE)
    const normalizedName = normalizeName(name)
    const config = buildRcloneConfig(protocolType, protocolFields)
    const remotes = await remoteConfig.listRemoteConfigs()
    if (!findRemote(remotes, normalizedName))
      throwServerError(APP_ERROR_CODE.SERVER_NOT_FOUND, 'Server does not exist.', { meta: { name: normalizedName } })

    await remoteConfig.updateRemoteConfig(normalizedName, config)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to update the server.', {
      name,
    })
  }
}

export async function deleteServerConnection(name, onProgress) {
  try {
    onProgress?.(SERVER_DELETE_PROGRESS_STEP.DELETE)
    const normalizedName = normalizeName(name)
    const remotes = await remoteConfig.listRemoteConfigs()
    if (!findRemote(remotes, normalizedName))
      throwServerError(APP_ERROR_CODE.SERVER_NOT_FOUND, 'Server does not exist.', { meta: { name: normalizedName } })

    await remoteConfig.deleteRemoteConfig(normalizedName)
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to delete the server.', {
      name,
    })
  }
}

export async function renameServerConnection(
  name,
  expectedName,
  protocolType = null,
  protocolFields = null,
  onProgress,
) {
  try {
    onProgress?.(SERVER_UPDATE_PROGRESS_STEP.SAVE)
    const currentName = normalizeName(name)
    const nextName = normalizeName(expectedName, 'expectedName')
    if (currentName === nextName)
      return

    const remotes = await remoteConfig.listRemoteConfigs()
    const sourceRemote = findRemote(remotes, currentName)
    if (!sourceRemote)
      throwServerError(APP_ERROR_CODE.SERVER_NOT_FOUND, 'Server does not exist.', { meta: { name: currentName } })
    if (findRemote(remotes, nextName))
      throwServerError(APP_ERROR_CODE.SERVER_ALREADY_EXISTS, 'Server already exists.', { meta: { name: nextName } })

    const nextConfig = protocolType == null && protocolFields == null
      ? normalizeRemoteConfig(sourceRemote.config)
      : buildRcloneConfig(protocolType, protocolFields)

    await remoteConfig.createRemoteConfig(nextName, nextConfig)
    try {
      await remoteConfig.deleteRemoteConfig(currentName)
    }
    catch (error) {
      try {
        await remoteConfig.deleteRemoteConfig(nextName)
      }
      catch {}
      throw error
    }
  }
  catch (error) {
    throwServerErrorFromRclone(error, 'Failed to rename the server.', {
      name,
      expectedName,
    })
  }
}
