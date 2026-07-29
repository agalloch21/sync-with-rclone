/**
 * @typedef {object} FileEntry
 * @property {string} path - Path relative to the snapshot root
 * @property {number} size - File size in bytes
 * @property {number} mtimeMs - Modified time in milliseconds
 */

/**
 * @typedef {object} Snapshot
 * @property {string} root - Absolute local path or rclone remote path
 * @property {FileEntry[]} files - Serializable file entries sorted by path
 */

/**
 * @typedef {FileEntry & { state: DiffState }} DiffFileEntry
 */

/**
 * @typedef {object} DiffSummary
 * @property {number} modified - Count of modified files
 * @property {number} added - Count of added files
 * @property {number} deleted - Count of deleted files
 */

/**
 * @typedef {object} DiffSnapshot
 * @property {string} srcRoot - Source root path
 * @property {string} dstRoot - Destination root path
 * @property {DiffFileEntry[]} files - Serializable changed file entries sorted by path
 * @property {DiffSummary} summary - File-level change summary
 */

/** @enum {number} */
export const DiffState = Object.freeze({
  unchanged: 0,
  modified: 1,
  added: 2,
  deleted: 3,
})

export function getDiffStateStr(state) {
  switch (state) {
    case DiffState.unchanged: return 'unchanged'
    case DiffState.modified: return 'modified'
    case DiffState.added: return 'added'
    case DiffState.deleted: return 'deleted'
    default: return 'unknown'
  }
}

export function createEmptySnapshot(root) {
  return {
    root,
    files: [],
  }
}

export function createEmptyDiffSnapshot(srcRoot, dstRoot) {
  return {
    srcRoot,
    dstRoot,
    files: [],
    summary: {
      modified: 0,
      added: 0,
      deleted: 0,
    },
  }
}

export function sortFilesByPath(files) {
  files.sort((left, right) => left.path.localeCompare(right.path))
  return files
}

export function addFileToSnapshot(snapshot, filePath, size, mtimeMs) {
  snapshot.files.push({
    path: filePath,
    size,
    mtimeMs,
  })
}

export function indexSnapshotFiles(snapshot) {
  return new Map(snapshot.files.map(file => [file.path, file]))
}

export function addFileToDiffSnapshot(diffSnapshot, filePath, state, size, mtimeMs) {
  diffSnapshot.files.push({
    path: filePath,
    state,
    size,
    mtimeMs,
  })

  if (state === DiffState.modified)
    diffSnapshot.summary.modified += 1
  else if (state === DiffState.added)
    diffSnapshot.summary.added += 1
  else if (state === DiffState.deleted)
    diffSnapshot.summary.deleted += 1
}
