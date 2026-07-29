import { createRcloneCommand, runCommand as defaultRunCommand } from '#src/infrastructure/rclone/rclone-command.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'

function isDirectoryNotFoundError(error) {
  return error?.code === 3 || error?.exitCode === 3 || error?.status === 3
}

export async function ensureRemoteFolderExists(remoteFolderPath, runtimePaths, runtime = {}, cancelSignal = null) {
  if (!remoteFolderPath)
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'remoteFolderPath is required')

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
      throwAppError(
        APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED,
        error?.message || `Failed to check remote folder: ${remoteFolderPath}`,
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
    throwAppError(
      APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED,
      error?.message || `Failed to create remote folder: ${remoteFolderPath}`,
      { cause: error },
    )
  }

  return { created: true }
}
