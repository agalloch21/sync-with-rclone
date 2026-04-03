import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function normalizeLocalPath(inputPath) {
  return inputPath
    .replaceAll('\\', path.posix.sep)
    .replaceAll(path.sep, path.posix.sep)
}

export function expandHomeDir(inputPath) {
  if (!inputPath)
    return inputPath

  if (inputPath === '~')
    return os.homedir()

  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\'))
    return path.join(os.homedir(), inputPath.slice(2))

  return inputPath
}

export function resolveLocalDirectoryPath(inputPath) {
  if (!inputPath)
    throw new Error('Path can not be empty')

  const expandedPath = expandHomeDir(inputPath)
  const normalizedPath = normalizeLocalPath(expandedPath)
  const absolutePath = path.posix.resolve(normalizedPath)

  let stat = null
  try {
    stat = fs.statSync(absolutePath)
  }
  catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(`Path does not exist: ${absolutePath}`)
    throw error
  }

  if (stat == null || stat.isDirectory() === false)
    throw new Error(`Expected a directory path, got: ${absolutePath}`)

  return absolutePath
}

export function trimTrailingSlash(inputPath) {
  if (inputPath === '/')
    return inputPath

  return inputPath.replace(/\/+$/, '')
}
