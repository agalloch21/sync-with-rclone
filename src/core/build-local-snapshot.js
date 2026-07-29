/** @typedef {import('./snapshot.js').Snapshot} Snapshot */
import fs from 'node:fs/promises'
import path from 'node:path'
import { addFileToSnapshot, createEmptySnapshot, sortFilesByPath } from '#src/domain/synchronization/snapshot.js'
import ignore from 'ignore'

/**
 * A wrapper of node-ignore filter
 * @typedef {object} Filter
 * @property {string} dirPath - relative path to the root
 * @property {string[]} patterns - patterns used
 * @property {ignore} ig - node-ignore object
 */

const PATTERN_FILE = '.gitignore'

const FORBIDDEN_CHARS = /[<>:"/\\|?*\x00-\x1F]/
function isValidFilename(name) {
  if (!name || name.length > 255)
    return false

  return !FORBIDDEN_CHARS.test(name)
}

/**
 * Create a node-ignore object with the patterns
 *
 * @param {string} absFilePath - entry key of the directory
 * @return {Promise<string[]>} - patterns
 */
async function readPatterns(absFilePath) {
  try {
    await fs.stat(absFilePath)
  }
  catch {
    // return undefined if not found
    return
  }

  try {
    const content = await fs.readFile(absFilePath, 'utf-8')
    const patterns = content.split(/\r?\n/) // will return [] if content is empty

    const filtered = [...new Set(patterns
      .map(p => p.trim())
      .filter(p => p.startsWith('#') === false && p.length > 0))]

    return filtered
  }
  catch (err) {
    throw new Error(`Error reading file ${absFilePath}. ${err}`)
  }
}

/**
 *
 *
 * @param {Filterp[]} filters
 * @param {string} entryPath
 * @param {boolean} isDir
 * @return {boolean}
 */
function checkIgnore(filters, entryPath, isDir) {
  let ignored = false

  for (const filter of filters) {
    const pathToFilter = path.posix.relative(filter.dirPath, entryPath) + (isDir ? '/' : '')
    const res = filter.ig.ignores(pathToFilter)
    if (ignored === false) {
      ignored = res
    }
    else {
      // double check due to the node-ignore bug
      const check = filter.ig.checkIgnore(pathToFilter)
      if (check.unignored === true) {
        ignored = false
      }
    }
  }
  return ignored
}

/**
 * Main function to walk through the directory
 *
 * @param {string} dirPath
 * @param {Filter[]} filterStack
 * @param {Snapshot} snapshot
 */
async function walkDir(dirPath, filterStack, snapshot) {
  const entrieNames = await fs.readdir(path.posix.join(snapshot.root, dirPath))

  // Load local ignore file if exists
  let filters = filterStack
  if (entrieNames.includes(PATTERN_FILE)) {
    const patterns = await readPatterns(path.posix.resolve(snapshot.root, dirPath, PATTERN_FILE))
    filters = filterStack.concat({
      dirPath,
      patterns,
      ig: ignore().add(patterns),
    })
  }

  // Iterate, filter and push entries
  for (const entryName of entrieNames) {
    const entryPath = path.posix.join(dirPath, entryName)
    const stat = await fs.stat(path.posix.join(snapshot.root, entryPath))
    const type = stat.isFile() ? 'file' : (stat.isDirectory() ? 'dir' : null)
    const isValidName = isValidFilename(entryName)
    if (!type || !isValidName)
      continue

    const isDir = stat.isDirectory()
    if (checkIgnore(filters, path.posix.join(entryPath), isDir))
      continue

    if (isDir)
      await walkDir(entryPath, filters, snapshot)
    else
      addFileToSnapshot(snapshot, entryPath, stat.size, stat.mtimeMs)
  }
}

/**
 * Build snapshot by walk throughing the directory while applying ignore filter
 *
 * @export
 * @param {string} rootAbsPath - absolute path
 * @return {Snapshot}
 */
export async function buildLocalSnapshot(rootAbsPath, extraPatterns = []) {
  if (!path.isAbsolute(rootAbsPath)) {
    throw new Error(`Input must be an absolute path. ${rootAbsPath}`)
  }
  rootAbsPath = rootAbsPath.replaceAll(path.sep, path.posix.sep)

  const snapshot = createEmptySnapshot(rootAbsPath)

  // Create initial filter
  /** @type {Filter[]} */
  const filterStack = []
  if (extraPatterns && extraPatterns?.length > 0) {
    filterStack.push({
      dirPath: '.',
      patterns: extraPatterns,
      ig: ignore().add(extraPatterns),
    })
  }

  // Walk through the directory
  const rootStat = await fs.stat(rootAbsPath)
  if (rootStat.isDirectory()) {
    await walkDir('.', filterStack, snapshot)
  }
  else if (rootStat.isFile()) {
    const fileName = path.posix.basename(rootAbsPath)
    if (isValidFilename(fileName))
      addFileToSnapshot(snapshot, fileName, rootStat.size, rootStat.mtimeMs)
  }

  sortFilesByPath(snapshot.files)
  return snapshot
}
