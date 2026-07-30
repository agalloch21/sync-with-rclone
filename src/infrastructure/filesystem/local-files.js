import fs from 'node:fs/promises'
import path from 'node:path'
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
    await fs.stat(absFilePath)
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

async function walkDirectory(rootPath, dirPath, filterStack, fileEntries) {
  const entryNames = await fs.readdir(path.posix.join(rootPath, dirPath))
  let filters = filterStack

  if (entryNames.includes(PATTERN_FILE)) {
    const patterns = await readPatterns(path.posix.resolve(rootPath, dirPath, PATTERN_FILE))
    filters = filterStack.concat({
      dirPath,
      patterns,
      ig: ignore().add(patterns),
    })
  }

  for (const entryName of entryNames) {
    const entryPath = path.posix.join(dirPath, entryName)
    const stat = await fs.stat(path.posix.join(rootPath, entryPath))
    const isFile = stat.isFile()
    const isDirectory = stat.isDirectory()

    if ((!isFile && !isDirectory) || !isValidFilename(entryName))
      continue
    if (checkIgnore(filters, entryPath, isDirectory))
      continue

    if (isDirectory) {
      await walkDirectory(rootPath, entryPath, filters, fileEntries)
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

export async function listLocalFiles(rootAbsPath, extraPatterns = []) {
  if (!path.isAbsolute(rootAbsPath))
    throw new Error(`Input must be an absolute path. ${rootAbsPath}`)

  const rootPath = rootAbsPath.replaceAll(path.sep, path.posix.sep)
  const fileEntries = []
  const filterStack = []

  if (extraPatterns?.length > 0) {
    filterStack.push({
      dirPath: '.',
      patterns: extraPatterns,
      ig: ignore().add(extraPatterns),
    })
  }

  const rootStat = await fs.stat(rootPath)
  if (rootStat.isDirectory()) {
    await walkDirectory(rootPath, '.', filterStack, fileEntries)
  }
  else if (rootStat.isFile()) {
    const fileName = path.posix.basename(rootPath)
    if (isValidFilename(fileName)) {
      fileEntries.push({
        path: fileName,
        size: rootStat.size,
        mtimeMs: rootStat.mtimeMs,
      })
    }
  }

  return fileEntries
}
