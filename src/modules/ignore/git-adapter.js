import fs from 'node:fs/promises'
/** @typedef {import('#src/types/snapshot.d.ts').Snapshot} Snapshot */
import path from 'node:path'
import ignore from 'ignore'

const PATTERN_FILE = '.gitignore'
/**
 * Create a node-ignore object with the patterns
 *
 * @param {string} absFilePath - entry key of the directory
 * @return {ignore} - ignore object
 */
async function createFilter(absFilePath) {
  try {
    await fs.stat(absFilePath)
  }
  catch {
    // return undefined if not found
    return
  }

  try {
    const contents = await fs.readFile(absFilePath, 'utf-8')
    const patterns = contents.split(/\r?\n/)

    const filtered = [...new Set(patterns
      .map(p => p.trim())
      .filter(p => p.startsWith('#') === false && p.length > 0))]

    return ignore().add(filtered)
  }
  catch (err) {
    throw new Error(`Error reading file ${absFilePath}. ${err}`)
  }
}

/**
 * A wrapper of node-ignore filter
 * @typedef {object} Filter
 * @property {Snapshot} snapshot - snapshot of the entire directory
 * @property {string} [dirKey='.'] - relative path to the root
 * @property {ignore} [filterStack=[]] - node-ignore object
 */
async function filterDirectory(snapshot, dirKey = '.', filterStack = []) {
  const dirEntry = snapshot.dirEntries.get(dirKey)

  const children = dirEntry.children
  const filters = children.has(PATTERN_FILE) && children.get(PATTERN_FILE).type === 'file'
    ? filterStack.concat({ dirKey, ig: await createFilter(path.posix.resolve(snapshot.root, dirKey, PATTERN_FILE)) })
    : filterStack

  for (const [entryName, childRef] of children) {
    if (childRef.type === 'dir') {
      await filterDirectory(snapshot, childRef.path, filters)
    }
    else if (childRef.type === 'file') {
      let ignored = false
      for (const filter of filters) {
        const pathToFilter = path.posix.relative(filter.dirKey, childRef.path)
        const res = filter.ig.checkIgnore(pathToFilter)
        if (res.ignored) {
          ignored = true
        }
        else if (res.unignord) {
          ignored = false
        }
      }

      if (ignored) {
        snapshot.fileEntries.delete(childRef.path)
        children.delete(entryName)
      }
    }
  }

  if (children.size === 0 && dirKey !== '.') {
    snapshot.dirEntries.delete(dirKey)
    snapshot.dirEntries.get(dirEntry.parent)?.children.delete(path.posix.basename(dirKey))
  }
}

export const gitAdapter = {
  name: 'git',
  /** @param {Snapshot} snapshot */
  async apply(snapshot) {
    await filterDirectory(snapshot)
  },
}
