import path from 'node:path'

function normalizeFolderPath(folderPath) {
  const value = String(folderPath || '').replaceAll('\\', '/')
  if (!value)
    return ''

  const normalized = path.posix.normalize(value)
  if (normalized === '.')
    return ''
  if (normalized === '/')
    return '/'
  return normalized.replace(/\/$/, '')
}

function folderEscapesRoot(folderPath) {
  return folderPath === '..' || folderPath.startsWith('../')
}

function assertFolderStaysWithinRemote(folderPath, inputPath) {
  if (folderEscapesRoot(folderPath))
    throw new TypeError(`Remote folder path escapes its root: ${inputPath}`)
}

export function normalizeRemoteBasePath(folderPath) {
  const normalized = normalizeFolderPath(folderPath)
  assertFolderStaysWithinRemote(normalized, folderPath)
  return normalized
}

export function parseRemoteFolderPath(remotePath) {
  const value = String(remotePath || '').replaceAll('\\', '/')
  const separatorIndex = value.indexOf(':')
  if (separatorIndex <= 0)
    throw new TypeError(`Invalid rclone remote path: ${remotePath}`)

  const folderPath = normalizeFolderPath(value.slice(separatorIndex + 1))
  assertFolderStaysWithinRemote(folderPath, remotePath)
  return {
    remote: value.slice(0, separatorIndex),
    folderPath,
  }
}

export function formatRemoteFolderPath({ remote, folderPath }) {
  return `${remote}:${folderPath}`
}

export function normalizeRemoteFolderPath(remotePath) {
  return formatRemoteFolderPath(parseRemoteFolderPath(remotePath))
}

export function isRemoteFolderPathWithin(candidatePath, rootPath) {
  const candidate = parseRemoteFolderPath(candidatePath)
  const root = parseRemoteFolderPath(rootPath)

  if (candidate.remote !== root.remote)
    return false

  const candidateIsAbsolute = candidate.folderPath.startsWith('/')
  const rootIsAbsolute = root.folderPath.startsWith('/')
  if (candidateIsAbsolute !== rootIsAbsolute)
    return false

  if (!root.folderPath)
    return true
  if (root.folderPath === '/')
    return candidateIsAbsolute

  return candidate.folderPath === root.folderPath
    || candidate.folderPath.startsWith(`${root.folderPath}/`)
}

export function remoteFolderPathsOverlap(leftPath, rightPath) {
  const left = parseRemoteFolderPath(leftPath)
  const right = parseRemoteFolderPath(rightPath)
  if (left.remote !== right.remote)
    return false

  if (left.folderPath.startsWith('/') !== right.folderPath.startsWith('/'))
    return false

  if (!left.folderPath || !right.folderPath || left.folderPath === '/' || right.folderPath === '/')
    return true

  return left.folderPath === right.folderPath
    || left.folderPath.startsWith(`${right.folderPath}/`)
    || right.folderPath.startsWith(`${left.folderPath}/`)
}
