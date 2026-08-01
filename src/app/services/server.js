import * as remoteConfig from '#src/infrastructure/rclone/remote-config.js'
import { listRemoteFolderEntries } from '#src/infrastructure/rclone/remote-files.js'
import { APP_ERROR_CODE, AppError, throwAppError } from '../app-errors.js'
import { getProtocolDefinition, validateProtocolForm } from '../contracts/server-protocols.js'
import { buildServerFolderTree } from './server-folder-tree.js'

function throwInvalidRemote(detail, fields = null, meta = {}) {
  throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'Server validation failed.', {
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

function buildRemoteConfig(protocolType, protocolFields) {
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

function getRemoteAddress(remote) {
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

function remoteToServer(remote) {
  if (!remote)
    return null

  const { name, config } = remote
  return {
    name,
    type: config.type,
    address: getRemoteAddress(remote),
    status: 'unknown',
    config: removePasswordFields(config),
  }
}

function throwServerError(code, message, options = {}) {
  const { cause = null, detail = null, fields = null, meta = {} } = options
  throwAppError(code, message, {
    detail: detail ?? cause?.detail,
    fields: fields ?? cause?.fields,
    cause,
    meta: { ...cause?.meta, ...meta },
  })
}

function throwServerErrorFromAdapter(error, fallbackMessage, meta = {}) {
  if (error instanceof AppError)
    throw error

  throwServerError(APP_ERROR_CODE.SERVER_OPERATION_FAILED, fallbackMessage, { cause: error, meta })
}

export function buildEmptyServer(name) {
  return {
    name,
    type: null,
    address: '',
    status: 'unknown',
    config: null,
  }
}

export async function getServerFolderTree(name, folderPath = '') {
  const serverName = normalizeName(name)
  try {
    const entries = await listRemoteFolderEntries(serverName, folderPath)
    return buildServerFolderTree(serverName, entries, folderPath)
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to list server folders.', { name, folderPath })
  }
}

export async function listServers() {
  try {
    const remotes = await remoteConfig.listRemoteConfigs()
    return remotes.map(remote => remoteToServer(remote))
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to list servers.')
  }
}

export async function getServer(name) {
  const normalizedName = normalizeName(name)
  try {
    const remotes = await remoteConfig.listRemoteConfigs()
    return remoteToServer(findRemote(remotes, normalizedName))
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to get server.', { name })
  }
}

export async function testServer(name) {
  const normalizedName = normalizeName(name)
  try {
    await remoteConfig.testRemoteConfig(normalizedName)
  }
  catch (error) {
    throwServerError(APP_ERROR_CODE.SERVER_CONNECTION_FAILED, 'Server connection failed.', {
      cause: error,
      meta: { name },
    })
  }
}

export async function createServer(name, protocolType, protocolFields) {
  try {
    const normalizedName = normalizeName(name)
    const config = buildRemoteConfig(protocolType, protocolFields)
    const remotes = await remoteConfig.listRemoteConfigs()
    if (findRemote(remotes, normalizedName)) {
      throwServerError(APP_ERROR_CODE.SERVER_ALREADY_EXISTS, 'Server already exists.', {
        meta: { name: normalizedName },
      })
    }

    await remoteConfig.createRemoteConfig(normalizedName, config)
    return normalizedName
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to create server.', { name })
  }
}

export async function updateServer(name, protocolType, protocolFields) {
  try {
    const normalizedName = normalizeName(name)
    const config = buildRemoteConfig(protocolType, protocolFields)
    const remotes = await remoteConfig.listRemoteConfigs()
    if (!findRemote(remotes, normalizedName))
      throwServerError(APP_ERROR_CODE.SERVER_NOT_FOUND, 'Server does not exist.', { meta: { name: normalizedName } })

    await remoteConfig.updateRemoteConfig(normalizedName, config)
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to update the server.', { name })
  }
}

export async function deleteServer(name) {
  try {
    const normalizedName = normalizeName(name)
    const remotes = await remoteConfig.listRemoteConfigs()
    if (!findRemote(remotes, normalizedName))
      throwServerError(APP_ERROR_CODE.SERVER_NOT_FOUND, 'Server does not exist.', { meta: { name: normalizedName } })

    await remoteConfig.deleteRemoteConfig(normalizedName)
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to delete the server.', { name })
  }
}

export async function deleteCreatedServer(name) {
  try {
    await remoteConfig.deleteRemoteConfig(name)
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to roll back the server.', { name })
  }
}

export async function renameServer(name, expectedName, protocolType = null, protocolFields = null) {
  try {
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

    const previousStoredConfig = normalizeRemoteConfig(sourceRemote.config)
    const copiesStoredConfig = protocolType == null && protocolFields == null
    const nextConfig = copiesStoredConfig
      ? previousStoredConfig
      : buildRemoteConfig(protocolType, protocolFields)

    if (copiesStoredConfig)
      await remoteConfig.createRemoteConfigFromStoredConfig(nextName, nextConfig)
    else
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

    return {
      previousName: currentName,
      nextName,
      previousStoredConfig,
    }
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to rename the server.', { name, expectedName })
  }
}

export async function rollbackServerRename(renameReceipt) {
  try {
    const { previousName, nextName, previousStoredConfig } = renameReceipt || {}
    if (!previousName || !nextName || !previousStoredConfig)
      throw new TypeError('Invalid server rename receipt.')

    await remoteConfig.createRemoteConfigFromStoredConfig(previousName, previousStoredConfig)
    await remoteConfig.deleteRemoteConfig(nextName)
  }
  catch (error) {
    throwServerErrorFromAdapter(error, 'Failed to roll back the server rename.')
  }
}
