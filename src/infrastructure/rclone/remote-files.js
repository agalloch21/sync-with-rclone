import { normalizeLocalPath, trimTrailingSlash } from '#src/infrastructure/filesystem/local-path.js'
import {
  createInfrastructureError,
  INFRASTRUCTURE_ERROR_CODE,
  throwInfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import {
  createRcloneCommand,
  runCommand as defaultRunCommand,
  parseConfirmedFilesFromOutput,
  parseTransferProgressFromOutput,
  withBatchFile,
} from './rclone-command.js'

function normalizeFolderPath(inputPath = '') {
  return trimTrailingSlash(normalizeLocalPath(String(inputPath)).replace(/^\/+/, ''))
}

function isDirectoryNotFoundError(error) {
  return error?.code === 3 || error?.exitCode === 3 || error?.status === 3
}

export function parseRemoteFolderEntries(stdout, serverName) {
  let entries
  try {
    entries = JSON.parse(stdout || '[]')
  }
  catch (error) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse server folders.', {
      cause: error,
      detail: 'rclone lsjson returned invalid JSON.',
      meta: { serverName },
    })
  }

  if (!Array.isArray(entries)) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse server folders.', {
      detail: 'rclone lsjson did not return an array.',
      meta: { serverName },
    })
  }

  return entries
}

export async function listRemoteFolderEntries(name, folderPath = '', runtimePaths = getRuntimePaths()) {
  const normalizedFolderPath = normalizeFolderPath(folderPath)
  const command = createRcloneCommand(runtimePaths, [
    'lsjson',
    '--max-depth',
    '1',
    '--dirs-only',
    '--no-mimetype',
    `${name}:${normalizedFolderPath}`,
  ])

  let result
  try {
    result = await defaultRunCommand(command.command, command.args)
  }
  catch (error) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED, 'Failed to list rclone folders.', {
      detail: error?.stderr?.trim() || error?.stdout?.trim() || error?.message,
      cause: error,
      meta: { name },
    })
  }

  return parseRemoteFolderEntries(result.stdout, name)
}

function parseRemoteFileEntries(stdout, remotePath) {
  let entries
  try {
    entries = JSON.parse(stdout || '[]')
  }
  catch (error) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse remote files.', {
      cause: error,
      detail: 'rclone lsjson returned invalid JSON.',
      meta: { remotePath },
    })
  }

  if (!Array.isArray(entries)) {
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse remote files.', {
      detail: 'rclone lsjson did not return an array.',
      meta: { remotePath },
    })
  }

  return entries
    .filter(entry => entry?.IsDir !== true)
    .map(entry => ({
      path: entry.Path,
      size: entry.Size,
      mtimeMs: Date.parse(entry.ModTime),
    }))
}

export async function listRemoteFiles(
  remotePath,
  syncFilter = null,
  runtimePaths = getRuntimePaths(),
  cancelSignal = null,
) {
  const excludeArgs = (syncFilter?.rcloneExcludePatterns || [])
    .flatMap(pattern => ['--exclude', pattern])
  const command = createRcloneCommand(runtimePaths, [
    'lsjson',
    '-R',
    '--no-mimetype',
    ...excludeArgs,
    remotePath,
  ])

  let result
  try {
    result = await defaultRunCommand(command.command, command.args, { cancelSignal })
  }
  catch (error) {
    if (isDirectoryNotFoundError(error)) {
      throwInfrastructureError(
        INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_NOT_FOUND,
        'Remote folder was not found.',
        {
          detail: error?.stderr?.trim() || error?.stdout?.trim() || error?.message,
          cause: error,
          meta: { remotePath },
        },
      )
    }

    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED, 'Failed to list remote files.', {
      detail: error?.stderr?.trim() || error?.stdout?.trim() || error?.message,
      cause: error,
      meta: { remotePath },
    })
  }

  return parseRemoteFileEntries(result.stdout, remotePath)
    .filter(entry => !syncFilter?.ignores(entry.path, false))
}

function getCommandErrorDetail(error) {
  return error?.stderr?.trim() || error?.stdout?.trim() || error?.message
}

function createFileCommandError(error, operationType, message, meta) {
  const infrastructureError = createInfrastructureError(
    INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED,
    message,
    {
      cause: error,
      detail: getCommandErrorDetail(error),
      meta: { operationType, ...meta },
    },
  )
  infrastructureError.confirmedFiles = parseConfirmedFilesFromOutput(
    `${error?.stdout || ''}\n${error?.stderr || ''}`,
    operationType,
  )
  return infrastructureError
}

export async function copyFiles(
  sourceRoot,
  destinationRoot,
  paths,
  runtimePaths,
  {
    cancelSignal = null,
    onTransferProgress = null,
  } = {},
) {
  return await withBatchFile(paths, async (batchFilePath) => {
    const command = createRcloneCommand(runtimePaths, [
      'copy',
      sourceRoot,
      destinationRoot,
      '--metadata',
      '--refresh-times',
      '--sftp-disable-hashcheck',
      '--files-from',
      batchFilePath,
      '--use-json-log',
      '--log-level',
      'INFO',
      '--progress',
      '--stats',
      '500ms',
      '--stats-unit',
      'bytes',
    ])

    try {
      await defaultRunCommand(command.command, command.args, {
        cancelSignal,
        onOutput(output) {
          const progress = parseTransferProgressFromOutput(output)
          if (progress)
            onTransferProgress?.(progress)
        },
      })
      return paths
    }
    catch (error) {
      throw createFileCommandError(error, 'copy', 'Failed to copy files.', {
        sourceRoot,
        destinationRoot,
      })
    }
  })
}

export async function deleteFiles(
  root,
  paths,
  runtimePaths,
  cancelSignal = null,
) {
  return await withBatchFile(paths, async (batchFilePath) => {
    const command = createRcloneCommand(runtimePaths, [
      'delete',
      root,
      '--files-from',
      batchFilePath,
      '--rmdirs',
      '--use-json-log',
      '--log-level',
      'INFO',
    ])

    try {
      await defaultRunCommand(command.command, command.args, { cancelSignal })
      return paths
    }
    catch (error) {
      throw createFileCommandError(error, 'delete', 'Failed to delete files.', { root })
    }
  })
}

export async function cleanupEmptyDirectories(
  root,
  runtimePaths,
  cancelSignal = null,
) {
  const command = createRcloneCommand(runtimePaths, [
    'rmdirs',
    root,
    '--leave-root',
    '--use-json-log',
    '--log-level',
    'INFO',
  ])
  try {
    await defaultRunCommand(command.command, command.args, { cancelSignal })
  }
  catch (error) {
    throw createInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED,
      'Failed to clean up empty directories.',
      {
        cause: error,
        detail: getCommandErrorDetail(error),
        meta: { root },
      },
    )
  }
}

export async function ensureRemoteFolder(
  remoteFolderPath,
  runtimePaths,
  cancelSignal = null,
) {
  if (!remoteFolderPath)
    throwInfrastructureError(INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'remoteFolderPath is required')

  cancelSignal?.throwIfAborted()

  const probe = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    remoteFolderPath,
  ])

  try {
    await defaultRunCommand(probe.command, probe.args, { cancelSignal })
    return { created: false }
  }
  catch (error) {
    if (!isDirectoryNotFoundError(error)) {
      throwInfrastructureError(
        INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED,
        error?.message || `Failed to check remote folder: ${remoteFolderPath}`,
        { cause: error, meta: { remotePath: remoteFolderPath } },
      )
    }
  }

  cancelSignal?.throwIfAborted()

  const mkdir = createRcloneCommand(runtimePaths, [
    'mkdir',
    remoteFolderPath,
  ])
  try {
    await defaultRunCommand(mkdir.command, mkdir.args, { cancelSignal })
  }
  catch (error) {
    throwInfrastructureError(
      INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED,
      error?.message || `Failed to create remote folder: ${remoteFolderPath}`,
      { cause: error, meta: { remotePath: remoteFolderPath } },
    )
  }

  return { created: true }
}
