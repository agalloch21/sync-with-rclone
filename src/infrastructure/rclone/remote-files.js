import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { normalizeLocalPath, trimTrailingSlash } from '#src/infrastructure/filesystem/local-path.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import { createRcloneCommand, runCommand } from './rclone-command.js'

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
    result = await runCommand(command.command, command.args)
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
