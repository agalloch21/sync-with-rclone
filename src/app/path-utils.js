import path from 'node:path'

export function normalizeLocalPath(inputPath) {
  return inputPath.replaceAll(path.sep, path.posix.sep)
}

export function trimTrailingSlash(inputPath) {
  if (inputPath === '/')
    return inputPath

  return inputPath.replace(/\/+$/, '')
}

