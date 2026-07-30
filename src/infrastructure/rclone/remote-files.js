import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { normalizeLocalPath, trimTrailingSlash } from '#src/infrastructure/filesystem/local-path.js'
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

function createFolderNode(name, path, children = null) {
  return {
    type: 'directory',
    name,
    path,
    children,
  }
}

export function buildRemoteFolderTree(serverName, entries = [], folderPath = '') {
  const basePath = normalizeFolderPath(folderPath)
  const rootName = basePath.split('/').at(-1) || serverName
  const root = createFolderNode(rootName, basePath, [])
  const nodesByPath = new Map([[basePath, root]])

  const paths = entries
    .filter(entry => entry?.IsDir === true)
    .map(entry => normalizeFolderPath(entry?.Path || entry?.Name || ''))
    .filter(Boolean)
    .map(entryPath => basePath && entryPath !== basePath && !entryPath.startsWith(`${basePath}/`)
      ? `${basePath}/${entryPath}`
      : entryPath)
    .sort((left, right) => left.localeCompare(right))

  for (const entryPath of paths) {
    const relativePath = basePath ? entryPath.slice(basePath.length).replace(/^\/+/, '') : entryPath
    const segments = relativePath.split('/').filter(Boolean)
    let parentPath = basePath

    for (const segment of segments) {
      const nodePath = parentPath ? `${parentPath}/${segment}` : segment
      if (!nodesByPath.has(nodePath)) {
        const node = createFolderNode(segment, nodePath)
        nodesByPath.set(nodePath, node)
        const parentNode = nodesByPath.get(parentPath)
        parentNode.children ??= []
        parentNode.children.push(node)
      }
      parentPath = nodePath
    }
  }

  for (const node of nodesByPath.values()) {
    if (node.children)
      node.children.sort((left, right) => left.name.localeCompare(right.name))
  }

  return root
}

export function parseRemoteFolderTreeOutput(serverName, stdout, folderPath = '') {
  let entries
  try {
    entries = JSON.parse(stdout || '[]')
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse server folders.', {
      cause: error,
      detail: 'rclone lsjson returned invalid JSON.',
      meta: { serverName },
    })
  }

  if (!Array.isArray(entries)) {
    throwAppError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse server folders.', {
      detail: 'rclone lsjson did not return an array.',
      meta: { serverName },
    })
  }

  return buildRemoteFolderTree(serverName, entries, folderPath)
}

export async function listRemoteFolders(name, folderPath = '', runtimePaths = getRuntimePaths()) {
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
    throwAppError(APP_ERROR_CODE.RCLONE_COMMAND_FAILED, 'Failed to list rclone folders.', {
      detail: error?.stderr?.trim() || error?.stdout?.trim() || error?.message,
      cause: error,
      meta: { name },
    })
  }

  return parseRemoteFolderTreeOutput(name, result.stdout, normalizedFolderPath)
}

function parseRemoteFileEntries(stdout, remotePath) {
  let entries
  try {
    entries = JSON.parse(stdout || '[]')
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse remote files.', {
      cause: error,
      detail: 'rclone lsjson returned invalid JSON.',
      meta: { remotePath },
    })
  }

  if (!Array.isArray(entries)) {
    throwAppError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse remote files.', {
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
  runtimePaths = getRuntimePaths(),
  cancelSignal = null,
  runCommand = defaultRunCommand,
) {
  const command = createRcloneCommand(runtimePaths, [
    'lsjson',
    '-R',
    '--no-mimetype',
    remotePath,
  ])

  let result
  try {
    result = await runCommand(command.command, command.args, { cancelSignal })
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.RCLONE_COMMAND_FAILED, 'Failed to list remote files.', {
      detail: error?.stderr?.trim() || error?.stdout?.trim() || error?.message,
      cause: error,
      meta: { remotePath },
    })
  }

  return parseRemoteFileEntries(result.stdout, remotePath)
}

function attachConfirmedFiles(error, operationType) {
  error.confirmedFiles = parseConfirmedFilesFromOutput(
    `${error?.stdout || ''}\n${error?.stderr || ''}`,
    operationType,
  )
  return error
}

export async function copyFiles(
  sourceRoot,
  destinationRoot,
  paths,
  runtimePaths,
  {
    cancelSignal = null,
    onTransferProgress = null,
    runCommand = defaultRunCommand,
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
      await runCommand(command.command, command.args, {
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
      throw attachConfirmedFiles(error, 'copy')
    }
  })
}

export async function deleteFiles(
  root,
  paths,
  runtimePaths,
  {
    cancelSignal = null,
    runCommand = defaultRunCommand,
  } = {},
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
      await runCommand(command.command, command.args, { cancelSignal })
      return paths
    }
    catch (error) {
      throw attachConfirmedFiles(error, 'delete')
    }
  })
}

export async function cleanupEmptyDirectories(
  root,
  runtimePaths,
  {
    cancelSignal = null,
    runCommand = defaultRunCommand,
  } = {},
) {
  const command = createRcloneCommand(runtimePaths, [
    'rmdirs',
    root,
    '--leave-root',
    '--use-json-log',
    '--log-level',
    'INFO',
  ])
  await runCommand(command.command, command.args, { cancelSignal })
}

function isDirectoryNotFoundError(error) {
  return error?.code === 3 || error?.exitCode === 3 || error?.status === 3
}

export async function ensureRemoteFolder(
  remoteFolderPath,
  runtimePaths,
  {
    cancelSignal = null,
    runCommand = defaultRunCommand,
  } = {},
) {
  if (!remoteFolderPath)
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'remoteFolderPath is required')

  cancelSignal?.throwIfAborted()

  const probe = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    remoteFolderPath,
  ])

  try {
    await runCommand(probe.command, probe.args, { cancelSignal })
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
    await runCommand(mkdir.command, mkdir.args, { cancelSignal })
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
