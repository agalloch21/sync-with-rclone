/** @typedef {import('#src/types/snapshot.ss').Snapshot} Snapshot */
/** @typedef {import('#src/types/snapshot.js').DiffSnapshot} DiffSnapshot */

import { createEmptyDiffSnapshot, DiffState, pushEntryToDiffSnapshot, removeEntryFromSnapshot } from '#src/types/snapshot.js'

// function compareDirectory(dirPath, srcSnapshot, dstSnapshot, diffSnapshot) {
//   for (const [, srcEntryRef] of srcSnapshot.get(dirPath).children) {
//     const entryPath = srcEntryRef.path
//     if (srcEntryRef.isDir) {
//       compareDirectory()
//       continue
//     }

//     const srcFileEntry = srcSnapshot.fileEntries.get(entryPath)
//     const dstFileEntry = dstSnapshot.fileEntries.get(entryPath)
//     if (!dstFileEntry) {
//       pushEntryToDiffSnapshot(diffSnapshot, srcFileEntry.path, DiffState.added, srcFileEntry.isDir, srcFile.size, srcFile.mtimeMs)
//       continue
//     }

//     if (srcFileEntry.size !== dstFileEntry.size || srcFileEntry.mtimeMs !== dstFileEntry.mtimeMs) {
//       pushEntryToSnapshot('modified')
//     }
//     else {
//       pushEntryToSnapshot('unchanged')
//     }
//   }
// }
// function compareDirectoryReversely(dirPath, srcSnapshot, dstSnapshot, diffSnapshot){
//   for (const [, dstEntryRef] of dstSnapshot.get(dirPath).children) {
//     const entryPath = dstEntryRef.path
//     const isDir = dstEntryRef.isDir
//     const need_delete = isDir? (!srcSnapshot.dirEntries.has(entryPath)) : (!srcSnapshot.fileEntries.has(entryPath))
//     if(need_delete){
//         if(isDir){
//             // push this dir and its all children to snapshot and mark as 'deleted
//         }
//         else{
//             // push this file
//         }
//     }
//   }

// }

/**
 *
 *
 * @export
 * @param {Snapshot} srcSnapshot
 * @param {Snapshot} dstSnapshot
 * @return {DiffSnapshot}
 */
export function compareSnapshot(srcSnapshot, dstSnapshot) {
  const diffSnapshot = {
    srcRoot: srcSnapshot.root,
    dstRoot: dstSnapshot.root,
    fileEntries: new Map(),
    dirEntries: new Map([
      ['.', { parent: null, children: new Map(), changes: new Map() }],
    ]),
  }

  // todo: compare srcSnapshot and dstSnapshot, and then store the differences into a new flat DiffSnapshot object. The type of the differences include deleted, added and modified
}
