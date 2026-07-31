import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { throwInfrastructureError } from '#src/infrastructure/infrastructure-error.js'

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
    throwInfrastructureError('path.empty', 'Path can not be empty')

  const expandedPath = expandHomeDir(inputPath)
  const absolutePath = trimTrailingSlash(normalizeLocalPath(path.resolve(expandedPath)))

  let stat = null
  try {
    stat = fs.statSync(absolutePath)
  }
  catch (error) {
    if (error.code === 'ENOENT')
      throwInfrastructureError('path.not_found', `Path does not exist: ${absolutePath}`, { cause: error })
    throw error
  }

  if (stat == null || stat.isDirectory() === false)
    throwInfrastructureError('path.not_directory', `Expected a directory path, got: ${absolutePath}`)

  return absolutePath
}

export function trimTrailingSlash(inputPath) {
  if (inputPath === '/' || /^[A-Z]:\/$/i.test(inputPath))
    return inputPath

  return inputPath.replace(/\/+$/, '')
}
