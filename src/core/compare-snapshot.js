/** @typedef {import('#src/core/snapshot.js').Snapshot} Snapshot */
/** @typedef {import('#src/core/snapshot.js').DiffSnapshot} DiffSnapshot */

import { addFileToDiffSnapshot, createEmptyDiffSnapshot, DiffState, indexSnapshotFiles, sortFilesByPath } from '#src/core/snapshot.js'

const MTIME_TOLERANCE_MS = 1

/**
 * @export
 * @param {Snapshot} srcSnapshot
 * @param {Snapshot} dstSnapshot
 * @return {DiffSnapshot}
 */
export function compareSnapshot(srcSnapshot, dstSnapshot) {
  const diffSnapshot = createEmptyDiffSnapshot(srcSnapshot.root, dstSnapshot.root)
  const srcFiles = indexSnapshotFiles(srcSnapshot)
  const dstFiles = indexSnapshotFiles(dstSnapshot)

  function filesAreEquivalent(srcFileEntry, dstFileEntry) {
    if (srcFileEntry.size !== dstFileEntry.size)
      return false

    return Math.abs(srcFileEntry.mtimeMs - dstFileEntry.mtimeMs) <= MTIME_TOLERANCE_MS
  }

  for (const [entryPath, srcFileEntry] of srcFiles) {
    const dstFileEntry = dstFiles.get(entryPath)
    if (!dstFileEntry) {
      addFileToDiffSnapshot(diffSnapshot, entryPath, DiffState.added, srcFileEntry.size, srcFileEntry.mtimeMs)
      continue
    }

    if (!filesAreEquivalent(srcFileEntry, dstFileEntry))
      addFileToDiffSnapshot(diffSnapshot, entryPath, DiffState.modified, srcFileEntry.size, srcFileEntry.mtimeMs)
  }

  for (const [entryPath, dstFileEntry] of dstFiles) {
    if (!srcFiles.has(entryPath))
      addFileToDiffSnapshot(diffSnapshot, entryPath, DiffState.deleted, dstFileEntry.size, dstFileEntry.mtimeMs)
  }

  sortFilesByPath(diffSnapshot.files)
  return diffSnapshot
}
