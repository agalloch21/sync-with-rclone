import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRcloneCommand, runCommand } from '#src/core/rclone-command.js'
import { getRuntimePaths } from './runtime-paths.js'
import { getProtocolDefinition } from './sync-task/protocol-registry.js'

function parseConfigDump(stdout) {
  if (!stdout?.trim())
    return {}

  return JSON.parse(stdout)
}

export function getRcloneRemoteAddress(remote) {
  return remote.host || remote.url || remote.remote || remote.endpoint || ''
}

export function parseRcloneRemotesFromConfigDump(stdout) {
  const config = parseConfigDump(stdout)

  return Object.entries(config)
    .map(([name, rawRemote]) => ({
      name,
      ...(rawRemote || {}),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function buildOptionArgs(options) {
  return Object.entries(options || {}).flatMap(([key, value]) => [key, String(value)])
}

function asErrorMessage(error) {
  return error?.stderr?.trim() || error?.stdout?.trim() || error?.message || 'Unknown rclone error.'
}

function operationFailure(code, message, detail = '') {
  return {
    success: false,
    code,
    message,
    ...(detail ? { detail } : {}),
  }
}

function validationFailure(fieldErrors) {
  return {
    success: false,
    code: 'rclone.invalid_remote',
    message: 'Remote settings are invalid.',
    fieldErrors,
  }
}

function normalizeProtocolForm(type, form) {
  const protocol = getProtocolDefinition(type)
  if (!protocol)
    return null

  return Object.fromEntries(protocol.fields.map((field) => {
    const rawValue = form?.[field.name]
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

    if (field.type === 'number')
      return [field.name, Number(value)]

    return [field.name, value]
  }))
}

function normalizeRemote(remote) {
  const { name, type, ...remoteFields } = remote || {}
  const fieldErrors = {}

  if (!name)
    fieldErrors.name = 'Name is required.'
  if (!type)
    fieldErrors.type = 'Type is required.'
  else if (!getProtocolDefinition(type))
    fieldErrors.type = 'Unsupported protocol.'

  if (Object.keys(fieldErrors).length > 0)
    return validationFailure(fieldErrors)

  const normalizedFields = normalizeProtocolForm(type, {
    name,
    ...remoteFields,
  })
  const { name: normalizedName, ...normalizedRemoteFields } = normalizedFields

  return {
    success: true,
    value: {
      name: normalizedName,
      type,
      remoteFields: normalizedRemoteFields,
    },
  }
}

export async function listRcloneRemotes(runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, ['config', 'dump'])
  const result = await runCommand(command.command, command.args)
  return parseRcloneRemotesFromConfigDump(result.stdout)
}

export async function testRcloneRemote(remoteName, runtimePaths = getRuntimePaths()) {
  if (!remoteName)
    throw new Error('remoteName is required')

  const command = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    `${remoteName}:`,
  ])

  try {
    await runCommand(command.command, command.args)
    return { success: true }
  }
  catch (error) {
    return operationFailure('rclone.connection_failed', 'Could not connect to the server.', asErrorMessage(error))
  }
}

export async function createRcloneRemote(remote, runtimePaths = getRuntimePaths()) {
  const normalized = normalizeRemote(remote)

  if (!normalized.success)
    return normalized

  const { name, type: remoteType, remoteFields } = normalized.value
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-remote-test-'))
  const tempRuntimePaths = {
    ...runtimePaths,
    rcloneConfigPath: path.join(tempDir, 'rclone.conf'),
  }

  try {
    const tempCreateResult = await writeRcloneRemote({ name, type: remoteType, ...remoteFields }, tempRuntimePaths)
    if (!tempCreateResult.success)
      return tempCreateResult

    const testResult = await testRcloneRemote(name, tempRuntimePaths)
    if (!testResult.success)
      return testResult

    const persistResult = await writeRcloneRemote({ name, type: remoteType, ...remoteFields }, runtimePaths)
    if (!persistResult.success)
      return persistResult

    return {
      success: true,
      remote: {
        name,
        type: remoteType,
        ...remoteFields,
      },
    }
  }
  finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

export async function writeRcloneRemote(remote, runtimePaths = getRuntimePaths()) {
  const normalized = normalizeRemote(remote)
  if (!normalized.success)
    return normalized

  const { name, type, remoteFields } = normalized.value
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'create',
    name,
    type,
    ...buildOptionArgs(remoteFields),
    '--obscure',
  ])

  try {
    await runCommand(command.command, command.args)
    return { success: true }
  }
  catch (error) {
    return operationFailure('rclone.config_create_failed', 'Could not create the rclone remote.', asErrorMessage(error))
  }
}

export async function updateRcloneRemote(remote, runtimePaths = getRuntimePaths()) {
  const normalized = normalizeRemote(remote)

  if (!normalized.success)
    return normalized

  const { name, type: remoteType, remoteFields } = normalized.value
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-remote-update-test-'))
  const tempRuntimePaths = {
    ...runtimePaths,
    rcloneConfigPath: path.join(tempDir, 'rclone.conf'),
  }

  try {
    const tempCreateResult = await writeRcloneRemote({ name, type: remoteType, ...remoteFields }, tempRuntimePaths)
    if (!tempCreateResult.success)
      return tempCreateResult

    const testResult = await testRcloneRemote(name, tempRuntimePaths)
    if (!testResult.success)
      return testResult

    const persistResult = await updateRcloneRemoteConfig({ name, type: remoteType, ...remoteFields }, runtimePaths)
    if (!persistResult.success)
      return persistResult

    return {
      success: true,
      remote: {
        name,
        type: remoteType,
        ...remoteFields,
      },
    }
  }
  finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

export async function updateRcloneRemoteConfig(remote, runtimePaths = getRuntimePaths()) {
  const normalized = normalizeRemote(remote)
  if (!normalized.success)
    return normalized

  const { name, type, remoteFields } = normalized.value
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'update',
    name,
    'type',
    type,
    ...buildOptionArgs(remoteFields),
    '--obscure',
  ])

  try {
    await runCommand(command.command, command.args)
    return { success: true }
  }
  catch (error) {
    return operationFailure('rclone.config_update_failed', 'Could not update the rclone remote.', asErrorMessage(error))
  }
}

export async function deleteRcloneRemote(remoteName, runtimePaths = getRuntimePaths()) {
  if (!remoteName)
    return validationFailure({ remoteName: 'Remote name is required.' })

  const command = createRcloneCommand(runtimePaths, [
    'config',
    'delete',
    remoteName,
  ])

  try {
    await runCommand(command.command, command.args)
    return { success: true }
  }
  catch (error) {
    return operationFailure('rclone.config_delete_failed', 'Could not delete the rclone remote.', asErrorMessage(error))
  }
}
