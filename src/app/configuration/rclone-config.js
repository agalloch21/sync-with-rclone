import { createRcloneCommand, runCommand } from '#src/core/rclone-command.js'
import { getRuntimePaths } from '../runtime-paths.js'
import { getProtocolDefinition, validateProtocolForm } from './protocol-registry.js'

function parseConfigDump(stdout) {
  if (!stdout?.trim())
    return {}

  return JSON.parse(stdout)
}

function parseRcloneRemotesFromConfigDump(stdout) {
  const config = parseConfigDump(stdout)
  return Object.entries(config)
    .map(([name, rawRemote]) => ({
      name,
      ...(rawRemote || {}),
    }))
    // .sort((left, right) => left.name.localeCompare(right.name))
}

function getRcloneRemoteAddress(remote) {
  return remote.host || remote.url || remote.remote || remote.endpoint || ''
}

function formatRawRcloneRemotes(remotes) {
  return remotes.map((remote) => {
    const { name, ...config } = remote
    return {
      name,
      type: config.type,
      address: getRcloneRemoteAddress(remote),
      status: 'unknown',
      config,
    }
  })
}

function buildOptionArgs(options) {
  return Object.entries(options || {}).flatMap(([key, value]) => [key, String(value)])
}

function validationFailure(message, fields = null) {
  return {
    success: false,
    error: {
      message,
      ...(fields != null && { fields }),
    },
  }
}

function validateRemote(name, config) {
  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return validationFailure('Name is required.')

  const { type: protocolType, ...protocolFields } = config || {}
  if (!protocolType || !protocolFields)
    return validationFailure('Protocol configuration is required.')

  const protocol = getProtocolDefinition(protocolType)
  if (!protocol)
    return validationFailure('Unsupported protocol.')

  const validateResult = validateProtocolForm(protocolType, protocolFields)
  if (!validateResult.success)
    return validationFailure('Invalid protocol configuration.', validateResult.error?.fields)

  return { success: true }
}

function normalizeRemoteName(name) {
  return name.trim()
}

function normalizeRemoteConfig(config) {
  const { type: protocolType, ...protocolFields } = config

  const protocol = getProtocolDefinition(protocolType)
  if (!protocol)
    throw new Error('normalizing remote config failed')

  const normalizedFields = Object.fromEntries(protocol.fields.map((field) => {
    const rawValue = protocolFields[field.name]
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

    if (field.type === 'number')
      return [field.name, Number(value)]

    return [field.name, value]
  }))

  return { type: protocolType, ...normalizedFields }
}

function testRcloneRemoteConfig(name, runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    `${name}:`,
  ])

  return runCommand(command.command, command.args)
}

function writeRcloneRemoteConfig(name, config, runtimePaths = getRuntimePaths()) {
  const { type: protocolType, ...protocolFields } = config

  const command = createRcloneCommand(runtimePaths, [
    'config',
    'create',
    name,
    protocolType,
    ...buildOptionArgs(protocolFields),
    '--obscure',
  ])

  return runCommand(command.command, command.args)
}

function updateRcloneRemoteConfig(name, config, runtimePaths = getRuntimePaths()) {
  const { type: protocolType, ...protocolFields } = config
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'update',
    name,
    'type',
    protocolType,
    ...buildOptionArgs(protocolFields),
    '--obscure',
  ])

  return runCommand(command.command, command.args)
}

function deleteRcloneRemoteConfig(name, runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'delete',
    name,
  ])

  return runCommand(command.command, command.args)
}

//* ================================ Exported Functions ==============================*/

export function buildRcloneConfig(protocolType, protocolFields) {
  return { type: protocolType, ...protocolFields }
}

export async function listRcloneRemotes(runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, ['config', 'dump'])

  const result = await runCommand(command.command, command.args)
  const remotes = parseRcloneRemotesFromConfigDump(result.stdout)
  return formatRawRcloneRemotes(remotes)
}

export async function getRcloneRemote(name, runtimePaths = getRuntimePaths()) {
  if (!name || typeof name !== 'string' || name.trim().length === 0)
    throw new Error('Remote name is required.')

  const normalizedName = normalizeRemoteName(name)
  const remotes = await listRcloneRemotes(runtimePaths)

  return remotes.find(remote => remote.name === normalizedName) || null
}

export async function testRcloneRemoteConnection(name, runtimePaths = getRuntimePaths()) {
  if (!name || typeof name !== 'string' || name.trim().length === 0)
    throw new Error('remote name is required')

  const normalizedName = normalizeRemoteName(name)

  await testRcloneRemoteConfig(normalizedName, runtimePaths)
}

export async function createRcloneRemote(name, config, runtimePaths = getRuntimePaths()) {
  const validateResult = validateRemote(name, config)
  if (!validateResult.success) {
    throw new Error('Rclone remote validation failed')
  }

  const normalizedName = normalizeRemoteName(name)
  const normalizedConfig = normalizeRemoteConfig(config)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object')
    throw new Error('Failed to list remotes.')

  if (remotes.some(remote => remote.name === normalizedName))
    throw new Error('Remote already exists.')

  await writeRcloneRemoteConfig(normalizedName, normalizedConfig, runtimePaths)
}

export async function updateRcloneRemote(name, config, runtimePaths = getRuntimePaths()) {
  const validateResult = validateRemote(name, config)
  if (!validateResult.success) {
    throw new Error('Rclone remote validation failed')
  }

  const normalizedName = normalizeRemoteName(name)
  const normalizedConfig = normalizeRemoteConfig(config)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object')
    throw new Error('Failed to list remotes.')

  if (remotes.some(remote => remote.name === normalizedName) === false)
    throw new Error('Remote does not exist.')

  await updateRcloneRemoteConfig(normalizedName, normalizedConfig, runtimePaths)
}

export async function deleteRcloneRemote(name, runtimePaths = getRuntimePaths()) {
  if (!name || typeof name !== 'string' || name.trim().length === 0)
    throw new Error('Remote name is required.')

  const normalizedName = normalizeRemoteName(name)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object')
    throw new Error('Failed to list remotes.')

  if (remotes.some(remote => remote.name === normalizedName) === false)
    throw new Error('Remote does not exist.')

  await deleteRcloneRemoteConfig(normalizedName, runtimePaths)
}

export async function renameRcloneRemote(name, expectedName, runtimePaths = getRuntimePaths()) {
  if (!name || typeof name !== 'string' || name.trim().length === 0
    || !expectedName || typeof expectedName !== 'string' || expectedName.trim().length === 0) {
    throw new Error('Invalid rclone operation request')
  }

  name = normalizeRemoteName(name)
  expectedName = normalizeRemoteName(expectedName)

  if (name === expectedName)
    return

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object')
    throw new Error('Failed to list remotes.')

  if (remotes.some(remote => remote.name === name) === false)
    throw new Error('Remote does not exist.')

  if (remotes.some(remote => remote.name === expectedName))
    throw new Error('The expected name has already been taken.')

  const config = remotes.find(remote => remote.name === name).config

  await createRcloneRemote(expectedName, config, runtimePaths)

  await deleteRcloneRemote(name, runtimePaths)
}
