/** @typedef {import('#src/types/snapshot.js').Snapshot} Snapshot */
/** @typedef {import('#src/types/snapshot.js').DiffSnapshot} DiffSnapshot */

import path from 'node:path'
import { createEmptyDiffSnapshot, DiffState } from '#src/types/snapshot.js'

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
  const diffSnapshot = createEmptyDiffSnapshot(srcSnapshot.root, dstSnapshot.root)

  function incrementChangeCount(dirPath, state) {
    let currentDirPath = dirPath
    while (currentDirPath) {
      const dirEntry = diffSnapshot.dirEntries.get(currentDirPath)
      dirEntry.changes.set(state, (dirEntry.changes.get(state) || 0) + 1)
      currentDirPath = dirEntry.parent
    }
  }

  function ensureDirEntry(dirPath) {
    if (diffSnapshot.dirEntries.has(dirPath))
      return

    const parentPath = path.posix.dirname(dirPath)
    ensureDirEntry(parentPath)

    diffSnapshot.dirEntries.set(dirPath, {
      parent: parentPath,
      children: new Map(),
      changes: new Map(),
    })
    diffSnapshot.dirEntries.get(parentPath).children.set(path.posix.basename(dirPath), {
      path: dirPath,
      isDir: true,
    })
  }

  function pushDiffEntry(entryPath, isDir, state, size, mtimeMs) {
    const parentPath = path.posix.dirname(entryPath)
    ensureDirEntry(parentPath)

    if (isDir) {
      if (!diffSnapshot.dirEntries.has(entryPath)) {
        diffSnapshot.dirEntries.set(entryPath, {
          parent: parentPath,
          children: new Map(),
          changes: new Map(),
        })
        diffSnapshot.dirEntries.get(parentPath).children.set(path.posix.basename(entryPath), {
          path: entryPath,
          isDir: true,
        })
      }
      //   incrementChangeCount(entryPath, state)  // Don't count dir-type changes
      return
    }

    if (!diffSnapshot.fileEntries.has(entryPath)) {
      diffSnapshot.fileEntries.set(entryPath, {
        parent: parentPath,
        state,
        size,
        mtimeMs,
      })
      diffSnapshot.dirEntries.get(parentPath).children.set(path.posix.basename(entryPath), {
        path: entryPath,
        isDir: false,
      })
      incrementChangeCount(parentPath, state)
    }
  }

  for (const [entryPath] of srcSnapshot.dirEntries) {
    if (entryPath !== '.' && !dstSnapshot.dirEntries.has(entryPath))
      pushDiffEntry(entryPath, true, DiffState.added)
  }

  for (const [entryPath, srcFileEntry] of srcSnapshot.fileEntries) {
    const dstFileEntry = dstSnapshot.fileEntries.get(entryPath)
    if (!dstFileEntry) {
      pushDiffEntry(entryPath, false, DiffState.added, srcFileEntry.size, srcFileEntry.mtimeMs)
      continue
    }

    if (srcFileEntry.size !== dstFileEntry.size || srcFileEntry.mtimeMs !== dstFileEntry.mtimeMs)
      pushDiffEntry(entryPath, false, DiffState.modified, srcFileEntry.size, srcFileEntry.mtimeMs)
  }

  for (const [entryPath] of dstSnapshot.dirEntries) {
    if (entryPath !== '.' && !srcSnapshot.dirEntries.has(entryPath))
      pushDiffEntry(entryPath, true, DiffState.deleted)
  }

  for (const [entryPath, dstFileEntry] of dstSnapshot.fileEntries) {
    if (!srcSnapshot.fileEntries.has(entryPath))
      pushDiffEntry(entryPath, false, DiffState.deleted, dstFileEntry.size, dstFileEntry.mtimeMs)
  }

  return diffSnapshot
}
