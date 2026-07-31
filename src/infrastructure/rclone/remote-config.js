import {
  INFRASTRUCTURE_ERROR_CODE,
  throwInfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import { createRcloneCommand, runCommand } from './rclone-command.js'

function parseConfigDump(stdout) {
  if (!stdout?.trim())
    return {}

  try {
    return JSON.parse(stdout)
  }
  catch (error) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse rclone config.', {
      detail: 'rclone config dump returned invalid JSON.',
      cause: error,
    })
  }
}

function buildOptionArgs(options) {
  return Object.entries(options || {}).flatMap(([key, value]) => [key, String(value)])
}

function getCommandErrorDetail(error) {
  return error?.stderr?.trim() || error?.stdout?.trim() || error?.message || 'rclone command failed.'
}

async function runRcloneConfigCommand(command, message, meta = {}) {
  try {
    return await runCommand(command.command, command.args)
  }
  catch (error) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED, message, {
      detail: getCommandErrorDetail(error),
      cause: error,
      meta,
    })
  }
}

export async function listRemoteConfigs(runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, ['config', 'dump'])
  const result = await runRcloneConfigCommand(command, 'Failed to list rclone remotes.')
  const config = parseConfigDump(result.stdout)

  return Object.entries(config).map(([name, rawRemote]) => ({
    name,
    config: rawRemote || {},
  }))
}

export async function testRemoteConfig(name, runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    `${name}:`,
  ])

  await runRcloneConfigCommand(command, 'Failed to test rclone remote connection.', { name })
}

export async function createRemoteConfig(name, config, runtimePaths = getRuntimePaths()) {
  const { type, ...fields } = config
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'create',
    name,
    type,
    ...buildOptionArgs(fields),
    '--obscure',
  ])

  await runRcloneConfigCommand(command, 'Failed to create rclone remote.', { name })
}

export async function updateRemoteConfig(name, config, runtimePaths = getRuntimePaths()) {
  const { type, ...fields } = config
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'update',
    name,
    'type',
    type,
    ...buildOptionArgs(fields),
    '--obscure',
  ])

  await runRcloneConfigCommand(command, 'Failed to update rclone remote.', { name })
}

export async function deleteRemoteConfig(name, runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'delete',
    name,
  ])

  await runRcloneConfigCommand(command, 'Failed to delete rclone remote.', { name })
}
