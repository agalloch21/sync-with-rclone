// eslint-disable e18e/prefer-static-regex
/** @typedef {import('#src/types/snapshot.d.ts').Snapshot} Snapshot */
import fs from 'node:fs/promises'
import path from 'node:path'
import ignore from 'ignore'

const PATTERN_FILE = '.gitignore'
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

function removeEntry(snapshot, entryKey, type) {
  if (entryKey === '.' && type === 'dir')
    return

  if (type === 'file') {
    const entry = snapshot.fileEntries.get(entryKey)
    snapshot.dirEntries.get(entry.parent).children.delete(path.posix.basename(entryKey))

    snapshot.fileEntries.delete(entryKey)
  }
  else if (type === 'dir') {
    const entry = snapshot.dirEntries.get(entryKey)
    snapshot.dirEntries.get(entry.parent).children.delete(path.posix.basename(entryKey))

    for (const child of entry.children.values()) {
      removeEntry(snapshot, child.path, child.type)
    }
    snapshot.dirEntries.delete(entryKey)
  }
}

/**
 * A wrapper of node-ignore filter
 * @typedef {object} Filter
 * @property {string} dirKey - relative path to the root
 * @property {string[]} patterns - patterns used
 * @property {ignore} ig - node-ignore object
 */

/**
 *
 *
 * @property {Snapshot} snapshot - snapshot of the entire directory
 * @param {string} [dirKey]  - relative path to the root
 * @param {Filter} [parentFilter] - ignore filter
 */
async function filterDirectory(snapshot, dirKey = '.', parentFilter = null) {
  const dirEntry = snapshot.dirEntries.get(dirKey)

  const children = dirEntry.children
  let filter = parentFilter
  if (children.has(PATTERN_FILE) && children.get(PATTERN_FILE).type === 'file') {
    const patterns = [
      ...(parentFilter?.patterns || []),
      ...(await readPatterns(path.posix.resolve(snapshot.root, dirKey, PATTERN_FILE))),
    ]
    filter = {
      dirKey,
      patterns,
      ig: ignore().add(patterns),
    }
  }

  for (const [, childRef] of children) {
    let ignored = false

    if (filter) {
      const pathToFilter = path.posix.relative(filter.dirKey, childRef.path) + (childRef.type === 'dir' ? '/' : '')
      const res = filter.ig.checkIgnore(pathToFilter)
      if (res.ignored) {
        ignored = true
      }
      else if (res.unignored) {
        ignored = false
      }
    }

    if (ignored) {
      removeEntry(snapshot, childRef.path, childRef.type)
    }
    else {
      if (childRef.type === 'dir') {
        await filterDirectory(snapshot, childRef.path, filter)
      }
    }
  }

//   if (children.size === 0 && dirKey !== '.') {
//     snapshot.dirEntries.delete(dirKey)
//     snapshot.dirEntries.get(dirEntry.parent)?.children.delete(path.posix.basename(dirKey))
//   }
}

export const gitAdapter = {
  name: 'git',
  /** @param {Snapshot} snapshot */
  async apply(snapshot) {
    await filterDirectory(snapshot)
  },
}
