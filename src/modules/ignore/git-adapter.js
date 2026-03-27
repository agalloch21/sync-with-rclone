import fs from 'node:fs/promises'
/** @typedef {import('#src/types/snapshot.d.ts').Snapshot} Snapshot */
import path from 'node:path'
import ignore from 'ignore'

const PATTERN_FILE = '.gitignore'
/**
 * Locate all the folders containing specific ignore file
 *
 * @export
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @return {string[]} - paths of dir relative to the root
 */
export function locateDirectories(snapshot) {
  const dirs = []
  snapshot.childrenByPath.forEach((fileNamesInDir, dirEntryKey) => {
    if (fileNamesInDir.includes(PATTERN_FILE)) {
      dirs.push(dirEntryKey)
    }
  })

  return dirs
}

/**
 * Create a node-ignore object with the patterns in the directory added
 *
 * @param {string} dirEntryKey - entry key of the directory
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @return {ignore} - ignore object
 */
async function createFilter(dirEntryKey, snapshot) {
  const filePath = path.posix.resolve(snapshot.root, dirEntryKey, PATTERN_FILE)
  try {
    await fs.stat(filePath)
  }
  catch {
    // return undefined if not found
    return
  }

  try {
    const contents = await fs.readFile(filePath, 'utf-8')
    const patterns = contents.split(/\r?\n/)

    const filtered = [...new Set(patterns
      .map(p => p.trim())
      .filter(p => p.startsWith('#') === false && p.length > 0))]

    return ignore().add(filtered)
  }
  catch (err) {
    throw new Error(`Error reading file ${filePath}. ${err}`)
  }
}

/**
 * Filter a directory recursively using the node-ignore object
 *
 * @param {string} dirEntryKey - entry key of the directory
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @param {ignore} ig - node-ignore object
 * @return {string[]} - keys of the filtered entries
 */
function filterEntries(dirEntryKey, snapshot, ig) {
  const filtered = []
  for (const child of snapshot.childrenByPath.get(dirEntryKey)) {
    const childKey = path.posix.join(dirEntryKey, child)
    const entry = snapshot.entriesByPath.get(childKey)
    const matchIgnore = entry.type === 'dir' ? ig?.ignores(childKey + path.posix.sep) : ig?.ignores(childKey)
    if (matchIgnore) {
      continue
    }

    filtered.push(childKey)
    if (entry.type === 'dir') {
      filtered.push(...filterEntries(childKey, snapshot, ig))
    }
  }
  return filtered
}

/**
 * Filter a specific direcotry
 *
 * @export
 * @param {string} dirEntryKey - entry key of the directory
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @return {string[]} - keys of the filtered entries
 */
export async function filterDirectory(dirEntryKey, snapshot) {
  const ig = await createFilter(dirEntryKey, snapshot)

  const filtered = filterEntries(dirEntryKey, snapshot, ig)

  return filtered
}

/**
 * Filter multiple directories
 *
 * @param {string[]} dirEntryKeys - keys of the directories
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @return {Set<string>} - keys of the filtered entries
 */
async function filterDirectories(dirEntryKeys, snapshot) {
  const filtered = []
  for (const dirEntryKey of dirEntryKeys) {
    filtered.push(...(await filterDirectory(dirEntryKey, snapshot)))
  }

  return [...new Set(filtered)]
}

/**
 * Reassemble new snapshot by the keys of filtered entires
 *
 * @param {string[]} filteredEntryKeys - keys of filtered entries
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @param {Snapshot} - new snapshot
 */
function reassembleSnapshot(filteredEntryKeys, snapshot) {
  /** @type {Snapshot} */
  const ss = {
    root: snapshot.root,
    entriesByPath: new Map(),
    childrenByPath: new Map(),
  }

  for (const key of filteredEntryKeys) {
    const entry = snapshot.entriesByPath.get(key)
    ss.entriesByPath.set(key, entry)

    const parentKey = path.posix.dirname(key) // both of dirname('node_modules') and dirname('index.js) are '.'
    if (ss.childrenByPath.has(parentKey) === false) {
      ss.childrenByPath.set(parentKey, [])
    }
    ss.childrenByPath.get(parentKey).push(path.posix.basename(key))
  }

  return ss
}

export const gitAdapter = {
  name: 'git',
  /** @param {Snapshot} snapshot */
  async apply(snapshot) {
    // walk through the snapshot to find ignore files
    const dirEntryKeys = locateDirectories(snapshot)

    // filter entries by directory
    const keysToKeep = await filterDirectories(dirEntryKeys, snapshot)

    // trim the snapshot
    return reassembleSnapshot(keysToKeep, snapshot)
  },
}
