import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRcloneCommand, runCommand } from '#src/core/rclone-command.js'
import { getRuntimePaths } from './runtime-paths.js'
import { createRemotePayload } from './sync-task/protocol-registry.js'

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

function normalizeRemote(remote) {
  const normalized = createRemotePayload(remote?.type, {
    name: remote?.name,
    ...(remote?.remoteOptions || remote?.options || {}),
  })

  if (!normalized.success)
    return normalized

  const { name, type, options } = normalized.value
  return {
    success: true,
    value: {
      name,
      type,
      remoteOptions: options,
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
    return { success: false, error: asErrorMessage(error) }
  }
}

export async function createRcloneRemote(remote, runtimePaths = getRuntimePaths()) {
  const normalized = normalizeRemote(remote)

  if (!normalized.success)
    return { success: false, errors: normalized.errors }

  const { name, type, remoteOptions } = normalized.value
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-remote-test-'))
  const tempRuntimePaths = {
    ...runtimePaths,
    rcloneConfigPath: path.join(tempDir, 'rclone.conf'),
  }

  try {
    const tempCreateResult = await writeRcloneRemote({ name, type, remoteOptions }, tempRuntimePaths)
    if (!tempCreateResult.success)
      return tempCreateResult

    const testResult = await testRcloneRemote(name, tempRuntimePaths)
    if (!testResult.success)
      return testResult

    const persistResult = await writeRcloneRemote({ name, type, remoteOptions }, runtimePaths)
    if (!persistResult.success)
      return persistResult

    return {
      success: true,
      remote: {
        name,
        type,
        ...remoteOptions,
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
    return { success: false, errors: normalized.errors }

  const { name, type, remoteOptions } = normalized.value
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'create',
    name,
    type,
    ...buildOptionArgs(remoteOptions),
    '--obscure',
  ])

  try {
    await runCommand(command.command, command.args)
    return { success: true }
  }
  catch (error) {
    return { success: false, error: asErrorMessage(error) }
  }
}

export async function updateRcloneRemote(remote, runtimePaths = getRuntimePaths()) {
  const normalized = normalizeRemote(remote)

  if (!normalized.success)
    return { success: false, errors: normalized.errors }

  const { name, type, remoteOptions } = normalized.value
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-remote-update-test-'))
  const tempRuntimePaths = {
    ...runtimePaths,
    rcloneConfigPath: path.join(tempDir, 'rclone.conf'),
  }

  try {
    const tempCreateResult = await writeRcloneRemote({ name, type, remoteOptions }, tempRuntimePaths)
    if (!tempCreateResult.success)
      return tempCreateResult

    const testResult = await testRcloneRemote(name, tempRuntimePaths)
    if (!testResult.success)
      return testResult

    const persistResult = await updateRcloneRemoteConfig({ name, type, remoteOptions }, runtimePaths)
    if (!persistResult.success)
      return persistResult

    return {
      success: true,
      remote: {
        name,
        type,
        ...remoteOptions,
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
    return { success: false, errors: normalized.errors }

  const { name, type, remoteOptions } = normalized.value
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'update',
    name,
    'type',
    type,
    ...buildOptionArgs(remoteOptions),
    '--obscure',
  ])

  try {
    await runCommand(command.command, command.args)
    return { success: true }
  }
  catch (error) {
    return { success: false, error: asErrorMessage(error) }
  }
}

export async function deleteRcloneRemote(remoteName, runtimePaths = getRuntimePaths()) {
  if (!remoteName)
    return { success: false, error: 'remoteName is required' }

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
    return { success: false, error: asErrorMessage(error) }
  }
}
