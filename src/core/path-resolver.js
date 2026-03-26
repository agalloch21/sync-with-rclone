import fs from 'node:fs'
import path from 'node:path'

export function resolvePath(inputPath) {
  if (!inputPath) {
    throw new Error('Path can not be empty')
  }

  inputPath = inputPath.replaceAll(path.sep, path.posix.sep)
  const absPath = path.posix.resolve(inputPath)

  let stat = null
  try {
    stat = fs.statSync(absPath)
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Path does not exist: ${absPath}`)
    }
  }

  if (stat == null || stat.isDirectory() === false) {
    throw new Error(`Expected a directory path, got: ${absPath}`)
  }

  return absPath
}
