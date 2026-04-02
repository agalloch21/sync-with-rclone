import path from 'node:path'
/**
 * @typedef {object} FileEntry - Entry object for file
 * @property {string} parent - Parent path relative to the root
 * @property {number} mtimeMs - Modified time in number
 * @property {number} size - File size
 */

/**
 * @typedef {object} DirEntry - Entry object for directory
 * @property {string | null} parent - Parent path relative to the root
 * @property {Map<string, ChildRef>} children - Map collection of refs to all children
 */

/**
 * @typedef {object} ChildRef - Object referencing to an entry
 * @property {string} path - Path relative to the root
 * @property {boolean} isDir - Whether the entry is a directory
 */

/**
 * @typedef {object} Snapshot - Snapshot
 * @property {string} root - Absolute path of the root directory
 * @property {Map<string, FileEntry>} fileEntries - Map collection of all files
 * @property {Map<string, DirEntry>} dirEntries - Map collection of all dirs
 */

/**
 *
 *
 * @export
 * @param {string} rootAbsPath
 * @return {Snapshot}
 */
export function createEmptySnapshot(rootAbsPath) {
  const snapshot = {
    root: rootAbsPath,
    fileEntries: new Map(),
    dirEntries: new Map([
      ['.', { parent: null, children: new Map() }],
    ]),
  }
  return snapshot
}

/**
 * Push a single entry into snapshot
 *
 * @export
 * @param {Snapshot} snapshot - Snapshot
 * @param {string} entryPath - Relative path to the root
 * @param {boolean} isDir - Whether the entry is directory
 * @param {number} size - File type only
 * @param {number} mtimeMs - File type only
 */
export function pushEntryToSnapshot(snapshot, entryPath, isDir, size, mtimeMs) {
  const dirName = path.posix.dirname(entryPath)
  const baseName = path.posix.basename(entryPath)
  const entryMap = isDir ? snapshot.dirEntries : snapshot.fileEntries
  const entry = isDir
    ? { parent: dirName, children: new Map() }
    : { parent: dirName, mtimeMs, size }

  entryMap.set(entryPath, entry)

  const parentEntryMap = snapshot.dirEntries.get(dirName)
  parentEntryMap.children.set(baseName, { path: entryPath, isDir })
}

/**
 *
 *
 * @export
 * @param {Snapshot} snapshot - Snapshot
 * @param {string} entryPath - Relative path to the root
 * @param {boolean} isDir - Whether the entry is directory
 */
export function removeEntryFromSnapshot(snapshot, entryPath, isDir) {
  if (entryPath === '.' && isDir)
    return

  if (isDir) {
    const entry = snapshot.dirEntries.get(entryPath)
    snapshot.dirEntries.get(entry.parent).children.delete(path.posix.basename(entryPath))

    for (const child of entry.children.values()) {
      removeEntryFromSnapshot(snapshot, child.path, child.isDir)
    }
    snapshot.dirEntries.delete(entryPath)
  }
  else {
    const entry = snapshot.fileEntries.get(entryPath)
    snapshot.dirEntries.get(entry.parent).children.delete(path.posix.basename(entryPath))

    snapshot.fileEntries.delete(entryPath)
  }
}

// ================================================================================

/** @enum {number} */
export const DiffState = Object.freeze({
  unchanged: 0,
  modified: 1,
  added: 2,
  deleted: 3,
})

export function getDiffStateStr(state) {
  switch (state) {
    case 0: return 'unchanged'
    case 1: return 'modified'
    case 2: return 'added'
    case 3: return 'deleted'
  }
}

/** @typedef {FileEntry & { state: DiffState }} DiffFileEntry */
/** @typedef {DirEntry & { changes: Map<DiffState, number> }} DiffDirEntry */

/**
 * @typedef {object} DiffSnapshot - Snapshot indicating the differences
 * @property {string} srcRoot - Absolute path of the source folder
 * @property {string} dstRoot - Absolute path of the dest folder
 * @property {Map<string, DiffFileEntry>} fileEntries - File collection
 * @property {Map<string, DiffDirEntry>} dirEntries - Directory collection
 */

/**
 *
 *
 * @export
 * @param {string} srcRootPath
 * @param {string} dstRootPath
 * @return {DiffSnapshot}
 */
export function createEmptyDiffSnapshot(srcRootPath, dstRootPath) {
  const snapshot = {
    srcRoot: srcRootPath,
    dstRoot: dstRootPath,
    fileEntries: new Map(),
    dirEntries: new Map([
      ['.', { parent: null, children: new Map(), changes: new Map() }],
    ]),
  }
  return snapshot
}

export function printDiffSnapshot(diffSnapshot) {
  printLog('========= Printing DiffSnapshot Start ========= ')
  printLog('srcRoot: ', diffSnapshot.srcRoot)
  printLog('dstRoot: ', diffSnapshot.dstRoot)
  for (const [filePath, fileEntry] of diffSnapshot.fileEntries) {
    printLog(`File: '${filePath}' => { 
        parent: '${fileEntry.parent}', 
        state: ${getDiffStateStr(fileEntry.state)}
    }`)
  }
  for (const [dirPath, dirEntry] of diffSnapshot.dirEntries) {
    const changesStr = `modified: ${dirEntry.changes.get(DiffState.modified) || 0}, added: ${dirEntry.changes.get(DiffState.added) || 0}, deleted: ${dirEntry.changes.get(DiffState.deleted) || 0}, unchanged: ${dirEntry.changes.get(DiffState.unchanged) || 0}`
    const childrenStr = `${[...dirEntry.children.keys()]}`
    printLog(`Dir: '${dirPath}' => { 
        parent: '${dirEntry.parent}', 
        changes:[ ${changesStr} ], 
        children: [ ${childrenStr} ]
    }`)
  }
  printLog('========= Printing DiffSnapshot End ========= ')
}

function printLog(str) {
  console.log(str) // eslint-disable-line no-console
}
