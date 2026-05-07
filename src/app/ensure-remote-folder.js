import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { buildRcloneArgs, getRcloneExecutable } from '#src/core/rclone-runtime.js'
import { APP_ERROR_CODE, AppError } from './app-errors.js'

const execFileAsync = promisify(execFile)

async function defaultRunCommand(command, args) {
  await execFileAsync(command, args)
}

function isDirectoryNotFoundError(error) {
  return error?.code === 3 || error?.exitCode === 3 || error?.status === 3
}

function createRcloneCommand(runtimePaths, commandArgs) {
  return {
    command: getRcloneExecutable(runtimePaths),
    args: buildRcloneArgs(runtimePaths, commandArgs),
  }
}

export async function ensureRemoteFolderExists(remoteFolderPath, runtimePaths, runtime = {}, cancelSignal = null) {
  if (!remoteFolderPath)
    throw new AppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'remoteFolderPath is required')

  const runCommand = runtime?.dependents?.runCommand || defaultRunCommand

  cancelSignal?.throwIfAborted()

  const probe = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    remoteFolderPath,
  ])

  try {
    await runCommand(probe.command, probe.args)
    return { created: false }
  }
  catch (error) {
    if (!isDirectoryNotFoundError(error)) {
      throw new AppError(
        APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED,
        error?.message || `Failed to check remote folder: ${remoteFolderPath}`,
        { remotePath: remoteFolderPath },
        { cause: error },
      )
    }
  }

  cancelSignal?.throwIfAborted()

  const mkdir = createRcloneCommand(runtimePaths, [
    'mkdir',
    remoteFolderPath,
  ])
  try {
    await runCommand(mkdir.command, mkdir.args)
  }
  catch (error) {
    throw new AppError(
      APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED,
      error?.message || `Failed to create remote folder: ${remoteFolderPath}`,
      { remotePath: remoteFolderPath },
      { cause: error },
    )
  }

  return { created: true }
}
