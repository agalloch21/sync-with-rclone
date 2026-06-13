import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRcloneCommand, runCommand as defaultRunCommand } from '#src/core/rclone-command.js'
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
      type: rawRemote?.type || '',
      host: rawRemote?.host || '',
      url: rawRemote?.url || '',
      remote: rawRemote?.remote || '',
      endpoint: rawRemote?.endpoint || '',
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function getRunCommand(runtime) {
  return runtime?.dependents?.runCommand || defaultRunCommand
}

function buildOptionArgs(options) {
  return Object.entries(options || {}).flatMap(([key, value]) => [key, String(value)])
}

function asErrorMessage(error) {
  return error?.stderr?.trim() || error?.stdout?.trim() || error?.message || 'Unknown rclone error.'
}

export async function listRcloneRemotes(runtimePaths = getRuntimePaths(), runtime = {}) {
  const runCommand = getRunCommand(runtime)
  const command = createRcloneCommand(runtimePaths, ['config', 'dump'])
  const result = await runCommand(command.command, command.args)
  return parseRcloneRemotesFromConfigDump(result.stdout)
}

export async function testRcloneRemote(remoteName, runtimePaths = getRuntimePaths(), runtime = {}) {
  if (!remoteName)
    throw new Error('remoteName is required')

  const runCommand = getRunCommand(runtime)
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

export async function createRcloneRemote(payload, runtimePaths = getRuntimePaths(), runtime = {}) {
  const normalized = createRemotePayload(payload?.type, {
    name: payload?.name,
    ...(payload?.options || {}),
  })

  if (!normalized.success)
    return { success: false, errors: normalized.errors }

  const { name, type, options } = normalized.value
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-remote-test-'))
  const tempRuntimePaths = {
    ...runtimePaths,
    rcloneConfigPath: path.join(tempDir, 'rclone.conf'),
  }

  try {
    const tempCreateResult = await writeRcloneRemote(name, type, options, tempRuntimePaths, runtime)
    if (!tempCreateResult.success)
      return tempCreateResult

    const testResult = await testRcloneRemote(name, tempRuntimePaths, runtime)
    if (!testResult.success)
      return testResult

    const persistResult = await writeRcloneRemote(name, type, options, runtimePaths, runtime)
    if (!persistResult.success)
      return persistResult

    return {
      success: true,
      remote: {
        name,
        type,
        ...options,
      },
    }
  }
  finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

export async function writeRcloneRemote(name, type, options, runtimePaths = getRuntimePaths(), runtime = {}) {
  const runCommand = getRunCommand(runtime)
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'create',
    name,
    type,
    ...buildOptionArgs(options),
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
