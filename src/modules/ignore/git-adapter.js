import fs from 'node:fs/promises'
/** @typedef {import('#src/types/snapshot.d.ts').Snapshot} Snapshot */
import path from 'node:path'
import ignore from 'ignore'

/**
 * Locate all the folders containing specific ignore file
 *
 * @export
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @param {string} [patternFile] - file name searching for
 * @return {string[]} - paths of dir relative to the root
 */
export function locateDirectories(snapshot, patternFile = '.gitignore') {
  const dirs = []
  snapshot.childrenByPath.forEach((fileNamesInDir, dirEntryKey) => {
    if (fileNamesInDir.includes(patternFile)) {
      dirs.push(dirEntryKey)
    }
  })

  return dirs
}

/**
 * Read ignore patterns from a file
 *
 * @export
 * @param {string} filePath - absolute path of the file
 * @return {string[]} - patterns
 */
export async function collectPatterns(filePath) {
  if (!path.isAbsolute(filePath)) {
    throw new Error('File path should be absolute')
  }

  try {
    const contents = await fs.readFile(filePath, 'utf-8')
    const patterns = contents.split(/\r?\n/)

    const filtered = [...new Set(patterns
      .map(p => p.trim())
      .filter(p => p.startsWith('#') === false && p.length > 0))]

    return filtered
  }
  catch (err) {
    throw new Error(`Error reading file ${filePath}. ${err}`)
  }
}

/**
 * Collect entires inside a folder
 *
 * @export
 * @param {string} dirEntryKey - folder path relative to the root
 * @param {Snapshot} snapshot - snapshot of the entire directory
 * @return {string[]} - keys of entries that need to be filtered
 */
export function gatherChildrenKeys(dirEntryKey, snapshot) {
  if (dirEntryKey.endsWith('/') || dirEntryKey.endsWith('\\')) {
    dirEntryKey = dirEntryKey.slice(0, -1)
  }

  if (dirEntryKey === '.') {
    return [...snapshot.entriesByPath.keys()]
  }

  if (snapshot.entriesByPath.has(dirEntryKey) === false) {
    throw new Error(`Entry ${dirEntryKey} not found in the snapshot`)
  }

  if (snapshot.entriesByPath.get(dirEntryKey).type !== 'dir' || snapshot.childrenByPath.has(dirEntryKey) === false) {
    throw new Error(`Entry ${dirEntryKey} is not a directory`)
  }

  const childrenKey = []
  for (const child of snapshot.childrenByPath.get(dirEntryKey)) {
    const childKey = path.posix.join(dirEntryKey, child)
    childrenKey.push(childKey)
    if (snapshot.entriesByPath.get(childKey).type === 'dir') {
      childrenKey.push(...gatherChildrenKeys(childKey, snapshot))
    }
  }
  return childrenKey

  //   const collectEntriesInFolder = function(dir)

  //   const filtered = Array.from(snapshot.entriesByPath.keys()).filter(p => p.startsWith(dirEntryKey))

//   return filtered.map((p) => {
//     // have to manually add '/' after each dir entries to specify its type
//     if (snapshot.entriesByPath.get(p).type === 'dir') {
//       p = p + path.posix.sep
//     }
//     return p.slice(dirEntryKey.length)
//   })
}

// export function filterEntries(dirEntryKey, snapshot, patterns) {
//     const childrenKeys = gatherChildrenKeys(dirEntryKey, snapshot)

//     const filtered = []
//     const ig = ignore().add(patterns)
//     for(const key of childrenKeys){
//         const localPath = key.slice(dirEntryKey.length)
//     }

//     for(const [key, entry] in snapshot.entriesByPath){

//     }

//   const filtered = ignore().add(patterns).filter(entries)
//   return filtered
// }
async function createFilter(dirEntryKey, snapshot, patternFile) {
  const filePath = path.posix.join(snapshot.root, dirEntryKey, patternFile)
  if (!path.isAbsolute(filePath)) {
    throw new Error('File path should be absolute')
  }

  try {
    const contents = fs.readFile(filePath, 'utf-8')
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
function filterEntries(dirEntryKey, snapshot, ig) {
  const filtered = []
  for (const child of snapshot.childrenByPath.get(dirEntryKey)) {
    const childKey = path.posix.join(dirEntryKey, child)
    const entry = snapshot.entriesByPath.get(childKey)
    const matchIgnore = entry.type === 'dir' ? ig.ignores(childKey + path.posix.sep) : ig.ignores(childKey)
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
export async function filterDirectory(dirEntryKey, snapshot, patternFile) {
//   // 去读.gitignore文件并验证
//   const patterns = await collectPatterns(path.join(snapshot.root, dirEntryKey, patternFile))

  //   // assemble all the files and folders in dirPath. 通过从entries里找到dirEntryKey开头的所有文件和文件夹, 然后再去掉开头
  //   const childrenKeys = gatherChildrenKeys(dirEntryKey, snapshot)

  //   // 让node-ignore去发挥作用
  //   const filtered = filterEntries(dirEntryKey, snapshot, patterns).map(p => path.posix.join(dirEntryKey, p))

  const ig = await createFilter(dirEntryKey, snapshot, patternFile)

  const filtered = filterEntries(dirEntryKey, snapshot, ig)

  return filtered
}

export async function filterDirectories(dirs, snapshot, patternFile = '.gitignore') {
  const filtered = []
  for (const dir of dirs) {
    filtered.push(await filterDirectory(dir, snapshot, patternFile))
  }

  return [...new Set(filtered.flat())]
}

export const gitAdapter = {
  name: 'git',
  patternFile: '.gitignore',
  /** @param {Snapshot} snapshot */
  async apply(snapshot) {
    // Walk through the snapshot to find ignore files
    const watchedDirs = locateDirectories(snapshot, this.patternFile)

    //
    const filtered = await filterDirectories(watchedDirs, snapshot, this.patternFile)

    return filtered
  },
}
