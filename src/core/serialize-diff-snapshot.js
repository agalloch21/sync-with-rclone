/** @typedef {import('#src/core/snapshot.js').DiffSnapshot} DiffSnapshot */

const DIFF_STATE_LABELS = {
  1: 'modified',
  2: 'added',
  3: 'deleted',
}

function getDirChangeSummary(dirEntry) {
  return {
    modified: dirEntry?.changes.get(1) || 0,
    added: dirEntry?.changes.get(2) || 0,
    deleted: dirEntry?.changes.get(3) || 0,
  }
}

function visitDir(diffSnapshot, dirPath) {
  const dirEntry = diffSnapshot.dirEntries.get(dirPath)
  if (!dirEntry)
    return []

  return [...dirEntry.children.entries()]
    .sort(([leftName, leftRef], [rightName, rightRef]) => {
      if (leftRef.isDir !== rightRef.isDir)
        return leftRef.isDir ? -1 : 1
      return leftName.localeCompare(rightName)
    })
    .map(([name, childRef]) => {
      if (childRef.isDir) {
        const childDirEntry = diffSnapshot.dirEntries.get(childRef.path)
        return {
          type: 'directory',
          name,
          path: childRef.path,
          changes: getDirChangeSummary(childDirEntry),
          children: visitDir(diffSnapshot, childRef.path),
        }
      }

      const fileEntry = diffSnapshot.fileEntries.get(childRef.path)
      return {
        type: 'file',
        name,
        path: childRef.path,
        state: DIFF_STATE_LABELS[fileEntry?.state] || 'unchanged',
        size: fileEntry?.size || 0,
        mtimeMs: fileEntry?.mtimeMs || 0,
      }
    })
}

function buildTree(diffSnapshot, dirPath = '.') {
  const dirEntry = diffSnapshot.dirEntries.get(dirPath)
  if (!dirEntry)
    return []

  const rootEntry = {
    type: 'directory',
    name: '.',
    path: '.',
    changes: getDirChangeSummary(dirEntry),
    children: visitDir(diffSnapshot, '.'),
  }

  return rootEntry
}

/**
 * Convert the diff snapshot into plain JSON for CLI output or UI transport.
 *
 * @export
 * @param {DiffSnapshot} diffSnapshot
 */
export function serializeDiffSnapshot(diffSnapshot) {
  const summary = {
    modified: 0,
    added: 0,
    deleted: 0,
  }

  for (const entry of diffSnapshot.fileEntries.values()) {
    if (entry.state === 1)
      summary.modified += 1
    else if (entry.state === 2)
      summary.added += 1
    else if (entry.state === 3)
      summary.deleted += 1
  }

  return {
    srcRoot: diffSnapshot.srcRoot,
    dstRoot: diffSnapshot.dstRoot,
    summary,
    tree: buildTree(diffSnapshot),
  }
}
