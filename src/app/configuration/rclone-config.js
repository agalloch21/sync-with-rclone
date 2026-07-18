import { createRcloneCommand, runCommand } from '#src/core/rclone-command.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { normalizeLocalPath, trimTrailingSlash } from '../path-utils.js'
import { getRuntimePaths } from '../runtime-paths.js'
import { getProtocolDefinition, validateProtocolForm } from './protocol-registry.js'

function assertName(name, fieldName = 'name') {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_INVALID_REMOTE, 'Invalid rclone remote.', {
      detail: 'Name is required.',
      fields: {
        [fieldName]: 'Name is required.',
      },
    })
  }
}

function assertRemoteConfig(config, meta = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_INVALID_REMOTE, 'Invalid rclone remote.', {
      detail: 'Protocol configuration is required.',
      fields: {
        config: 'Protocol configuration is required.',
      },
      meta,
    })
  }

  const { type, ...fields } = config
  if (!type || typeof type !== 'string') {
    throwRcloneError(APP_ERROR_CODE.RCLONE_INVALID_REMOTE, 'Invalid rclone remote.', {
      detail: 'Protocol type is required.',
      fields: {
        'config.type': 'Protocol type is required.',
      },
      meta,
    })
  }

  const protocol = getProtocolDefinition(type)
  if (!protocol) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_INVALID_REMOTE, 'Invalid rclone remote.', {
      detail: 'Unsupported protocol.',
      fields: {
        'config.type': 'Unsupported protocol.',
      },
      meta: {
        ...meta,
        protocolType: type,
      },
    })
  }

  const validateResult = validateProtocolForm(type, fields)
  if (!validateResult.success) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_INVALID_REMOTE, 'Invalid rclone remote.', {
      detail: 'Invalid protocol configuration.',
      fields: prefixedProtocolFields(validateResult.error?.fields),
      meta: {
        ...meta,
        protocolType: type,
      },
    })
  }
}

function assertRcloneRemoteInput(name, config, meta = {}) {
  assertName(name)
  assertRemoteConfig(config, meta)
}

function normalizeName(name) {
  return name.trim()
}

function normalizeRemoteConfig(config) {
  const { type, ...fields } = config || {}
  const protocol = getProtocolDefinition(type)

  const normalizedFields = Object.fromEntries(protocol.fields.map((field) => {
    const rawValue = fields[field.name]
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

    if (field.type === 'number')
      return [field.name, Number(value)]

    return [field.name, value]
  }))

  return { type, ...normalizedFields }
}

function parseConfigDump(stdout) {
  if (!stdout?.trim())
    return {}

  try {
    return JSON.parse(stdout)
  }
  catch (error) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse rclone config.', {
      detail: 'rclone config dump returned invalid JSON.',
      cause: error,
    })
  }
}

function parseRcloneRemotesFromConfigDump(stdout) {
  const rcloneConfig = parseConfigDump(stdout)
  return Object.entries(rcloneConfig)
    .map(([name, rawRemote]) => ({
      name,
      config: rawRemote || {},
    }))
}

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

export function buildFolderTree(serverName, entries = [], folderPath = '') {
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

export function parseFolderTreeOutput(serverName, stdout, folderPath = '') {
  let entries
  try {
    entries = JSON.parse(stdout || '[]')
  }
  catch (error) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse server folders.', {
      cause: error,
      detail: 'rclone lsjson returned invalid JSON.',
      meta: { serverName },
    })
  }

  if (!Array.isArray(entries)) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_PARSE_FAILED, 'Failed to parse server folders.', {
      detail: 'rclone lsjson did not return an array.',
      meta: { serverName },
    })
  }

  return buildFolderTree(serverName, entries, folderPath)
}

function buildOptionArgs(options) {
  return Object.entries(options || {}).flatMap(([key, value]) => [key, String(value)])
}

function prefixedProtocolFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [`config.${key}`, value]))
}

function getCommandErrorDetail(error) {
  return error?.stderr?.trim() || error?.stdout?.trim() || error?.message || 'rclone command failed.'
}

// Layer throw helpers use: (code, message, { cause, detail, fields, meta }).
function throwRcloneError(code, message, options = {}) {
  const { cause = null, detail = null, fields = null, meta = {} } = options
  throwAppError(code, message, {
    detail: detail ?? cause?.detail,
    fields: fields ?? cause?.fields,
    cause,
    meta,
  })
}

async function runRcloneOperation(command, message, meta = {}) {
  try {
    return await runCommand(command.command, command.args)
  }
  catch (error) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_COMMAND_FAILED, message, {
      detail: getCommandErrorDetail(error),
      cause: error,
      meta,
    })
  }
}

async function testRcloneRemoteConfig(name, runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, [
    'lsf',
    '--max-depth',
    '1',
    `${name}:`,
  ])

  return await runRcloneOperation(command, 'Failed to test rclone remote connection.', {
    name,
  })
}

async function writeRcloneRemoteConfig(name, config, runtimePaths = getRuntimePaths()) {
  const { type, ...fields } = config || {}

  const command = createRcloneCommand(runtimePaths, [
    'config',
    'create',
    name,
    type,
    ...buildOptionArgs(fields),
    '--obscure',
  ])

  return await runRcloneOperation(command, 'Failed to create rclone remote.', {
    name,
  })
}

async function updateRcloneRemoteConfig(name, config, runtimePaths = getRuntimePaths()) {
  const { type, ...fields } = config || {}

  const command = createRcloneCommand(runtimePaths, [
    'config',
    'update',
    name,
    'type',
    type,
    ...buildOptionArgs(fields),
    '--obscure',
  ])

  return await runRcloneOperation(command, 'Failed to update rclone remote.', {
    name,
  })
}

async function deleteRcloneRemoteConfig(name, runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, [
    'config',
    'delete',
    name,
  ])

  return await runRcloneOperation(command, 'Failed to delete rclone remote.', {
    name,
  })
}

//* ================================ Exported Fucntions ==============================*/

export async function listRcloneRemotes(runtimePaths = getRuntimePaths()) {
  const command = createRcloneCommand(runtimePaths, ['config', 'dump'])

  const result = await runRcloneOperation(command, 'Failed to list rclone remotes.')
  const remotes = parseRcloneRemotesFromConfigDump(result.stdout)

  return remotes
}

export async function getRcloneRemote(name, runtimePaths = getRuntimePaths()) {
  assertName(name)
  const normalizedName = normalizeName(name)
  const remotes = await listRcloneRemotes(runtimePaths)

  return remotes.find(remote => remote.name === normalizedName) || null
}

export async function getRcloneFolderTree(name, folderPath = '', runtimePaths = getRuntimePaths()) {
  assertName(name)
  const serverName = normalizeName(name)
  const normalizedFolderPath = normalizeFolderPath(folderPath)
  const command = createRcloneCommand(runtimePaths, [
    'lsjson',
    '--max-depth',
    '1',
    '--dirs-only',
    '--no-mimetype',
    `${serverName}:${normalizedFolderPath}`,
  ])

  const result = await runRcloneOperation(command, 'Failed to list rclone folders.', {
    name: serverName,
  })
  return parseFolderTreeOutput(serverName, result.stdout, normalizedFolderPath)
}

export async function testRcloneRemoteConnection(name, runtimePaths = getRuntimePaths()) {
  assertName(name)
  const normalizedName = normalizeName(name)

  await testRcloneRemoteConfig(normalizedName, runtimePaths)
}

export async function createRcloneRemote(name, config, runtimePaths = getRuntimePaths()) {
  assertRcloneRemoteInput(name, config)

  const normalizedName = normalizeName(name)
  const normalizedConfig = normalizeRemoteConfig(config)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object') {
    throwRcloneError(APP_ERROR_CODE.RCLONE_OPERATION_FAILED, 'Failed to list rclone remotes.')
  }

  if (remotes.some(remote => remote.name === normalizedName)) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_REMOTE_EXISTS, 'Rclone remote already exists.', {
      detail: `A remote named "${normalizedName}" already exists.`,
      meta: {
        name: normalizedName,
      },
    })
  }

  await writeRcloneRemoteConfig(normalizedName, normalizedConfig, runtimePaths)
}

export async function updateRcloneRemote(name, config, runtimePaths = getRuntimePaths()) {
  assertRcloneRemoteInput(name, config)

  const normalizedName = normalizeName(name)
  const normalizedConfig = normalizeRemoteConfig(config)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object') {
    throwRcloneError(APP_ERROR_CODE.RCLONE_OPERATION_FAILED, 'Failed to list rclone remotes.')
  }

  if (remotes.some(remote => remote.name === normalizedName) === false) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_REMOTE_MISSING, 'Rclone remote does not exist.', {
      detail: `A remote named "${normalizedName}" does not exist.`,
      meta: {
        name: normalizedName,
      },
    })
  }

  await updateRcloneRemoteConfig(normalizedName, normalizedConfig, runtimePaths)
}

export async function deleteRcloneRemote(name, runtimePaths = getRuntimePaths()) {
  assertName(name)
  const normalizedName = normalizeName(name)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object') {
    throwRcloneError(APP_ERROR_CODE.RCLONE_OPERATION_FAILED, 'Failed to list rclone remotes.')
  }

  if (remotes.some(remote => remote.name === normalizedName) === false) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_REMOTE_MISSING, 'Rclone remote does not exist.', {
      detail: `A remote named "${normalizedName}" does not exist.`,
      meta: {
        name: normalizedName,
      },
    })
  }

  await deleteRcloneRemoteConfig(normalizedName, runtimePaths)
}

export async function renameRcloneRemote(name, expectedName, config = null, runtimePaths = getRuntimePaths()) {
  assertName(name)
  assertName(expectedName, 'expectedName')
  const currentName = normalizeName(name)
  const nextName = normalizeName(expectedName)

  if (currentName === nextName)
    return

  if (config)
    assertRemoteConfig(config)

  const remotes = await listRcloneRemotes(runtimePaths)
  if (!remotes || typeof remotes !== 'object') {
    throwRcloneError(APP_ERROR_CODE.RCLONE_OPERATION_FAILED, 'Failed to list rclone remotes.')
  }

  const sourceRemote = remotes.find(remote => remote.name === currentName)
  if (!sourceRemote) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_REMOTE_MISSING, 'Rclone remote does not exist.', {
      detail: `A remote named "${currentName}" does not exist.`,
      meta: {
        name: currentName,
      },
    })
  }

  if (remotes.some(remote => remote.name === nextName)) {
    throwRcloneError(APP_ERROR_CODE.RCLONE_REMOTE_EXISTS, 'Rclone remote already exists.', {
      detail: `A remote named "${nextName}" already exists.`,
      meta: {
        name: nextName,
      },
    })
  }

  const nextConfig = normalizeRemoteConfig(config ?? sourceRemote.config)
  await writeRcloneRemoteConfig(nextName, nextConfig, runtimePaths)

  try {
    await deleteRcloneRemoteConfig(currentName, runtimePaths)
  }
  catch (error) {
    try {
      await deleteRcloneRemoteConfig(nextName, runtimePaths)
    }
    catch {}

    throwRcloneError(APP_ERROR_CODE.RCLONE_COMMAND_FAILED, 'Failed to rename rclone remote.', {
      detail: getCommandErrorDetail(error),
      cause: error,
      meta: {
        name: currentName,
        expectedName: nextName,
      },
    })
  }
}
