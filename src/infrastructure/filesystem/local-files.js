import fs from 'node:fs/promises'
import path from 'node:path'
import {
  INFRASTRUCTURE_ERROR_CODE,
  throwInfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import ignore from 'ignore'

const PATTERN_FILE = '.gitignore'
const FORBIDDEN_CHARS = /[<>:"/\\|?*\x00-\x1F]/

function isValidFilename(name) {
  if (!name || name.length > 255)
    return false

  return !FORBIDDEN_CHARS.test(name)
}

async function readPatterns(absFilePath) {
  try {
    const stat = await fs.lstat(absFilePath)
    if (stat.isSymbolicLink() || !stat.isFile())
      return
  }
  catch {
    return
  }

  try {
    const content = await fs.readFile(absFilePath, 'utf-8')
    return [...new Set(content
      .split(/\r?\n/)
      .map(pattern => pattern.trim())
      .filter(pattern => !pattern.startsWith('#') && pattern.length > 0))]
  }
  catch (error) {
    throw new Error(`Error reading file ${absFilePath}. ${error}`)
  }
}

function checkIgnore(filters, entryPath, isDir) {
  let ignored = false

  for (const filter of filters) {
    const pathToFilter = path.posix.relative(filter.dirPath, entryPath) + (isDir ? '/' : '')
    const result = filter.ig.ignores(pathToFilter)
    if (!ignored) {
      ignored = result
    }
    else if (filter.ig.checkIgnore(pathToFilter).unignored === true) {
      ignored = false
    }
  }

  return ignored
}

function resolveFilesystemPath(rootPath, relativePath = '.') {
  if (!relativePath || relativePath === '.')
    return rootPath

  return path.join(rootPath, ...relativePath.split('/'))
}

async function walkDirectory(rootPath, dirPath, gitIgnoreStack, syncFilter, fileEntries, cancelSignal) {
  cancelSignal?.throwIfAborted()
  const directoryPath = resolveFilesystemPath(rootPath, dirPath)
  const entryNames = await fs.readdir(directoryPath)
  let filters = gitIgnoreStack

  if (entryNames.includes(PATTERN_FILE)) {
    const patterns = await readPatterns(path.join(directoryPath, PATTERN_FILE))
    if (patterns) {
      filters = gitIgnoreStack.concat({
        dirPath,
        patterns,
        ig: ignore().add(patterns),
      })
    }
  }

  for (const entryName of entryNames) {
    cancelSignal?.throwIfAborted()
    const entryPath = path.posix.join(dirPath, entryName)
    const stat = await fs.lstat(path.join(directoryPath, entryName))
    if (stat.isSymbolicLink())
      continue

    const isFile = stat.isFile()
    const isDirectory = stat.isDirectory()

    if ((!isFile && !isDirectory) || !isValidFilename(entryName))
      continue
    if (syncFilter?.ignores(entryPath, isDirectory) || checkIgnore(filters, entryPath, isDirectory))
      continue

    if (isDirectory) {
      await walkDirectory(rootPath, entryPath, filters, syncFilter, fileEntries, cancelSignal)
    }
    else {
      fileEntries.push({
        path: entryPath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      })
    }
  }
}

export async function listLocalFiles(rootAbsPath, syncFilter = null, cancelSignal = null) {
  if (!path.isAbsolute(rootAbsPath))
    throw new Error(`Input must be an absolute path. ${rootAbsPath}`)

  const rootPath = path.resolve(rootAbsPath)
  const fileEntries = []
  const gitIgnoreStack = []

  const rootStat = await fs.stat(rootPath)

  if (rootStat.isDirectory()) {
    await walkDirectory(rootPath, '.', gitIgnoreStack, syncFilter, fileEntries, cancelSignal)
  }
  else if (rootStat.isFile()) {
    const fileName = path.basename(rootPath)
    if (isValidFilename(fileName) && !syncFilter?.ignores(fileName, false)) {
      fileEntries.push({
        path: fileName,
        size: rootStat.size,
        mtimeMs: rootStat.mtimeMs,
      })
    }
  }

  return fileEntries
}

export async function assertLocalPathsDoNotCrossSymbolicLinks(
  rootAbsPath,
  relativePaths,
  cancelSignal = null,
) {
  for (const relativePath of relativePaths) {
    let currentPath = rootAbsPath
    const traversedSegments = []

    for (const segment of relativePath.split('/').filter(Boolean)) {
      cancelSignal?.throwIfAborted()
      traversedSegments.push(segment)
      currentPath = path.join(currentPath, segment)

      let stat
      try {
        stat = await fs.lstat(currentPath)
      }
      catch (error) {
        if (error?.code === 'ENOENT')
          break
        throw error
      }

      if (stat.isSymbolicLink()) {
        const symbolicLinkPath = traversedSegments.join('/')
        throwInfrastructureError(
          INFRASTRUCTURE_ERROR_CODE.PATH_SYMBOLIC_LINK_CONFLICT,
          `Local path crosses a symbolic link: ${symbolicLinkPath}`,
          {
            meta: {
              localFolderPath: rootAbsPath,
              relativePath,
              symbolicLinkPath,
            },
          },
        )
      }
    }
  }
}
