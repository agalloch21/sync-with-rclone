import { DiffState } from '../snapshots/snapshot.js'

function isPathSelected(entryPath, selectedPathSet) {
  for (const selectedPath of selectedPathSet) {
    if (selectedPath === '.')
      return true
    if (entryPath === selectedPath || entryPath.startsWith(`${selectedPath}/`))
      return true
  }
  return false
}

function collectAllFilePaths(diffSnapshot) {
  return diffSnapshot.files.map(fileEntry => fileEntry.path)
}

function createPathTrie(paths) {
  const root = { terminal: false, children: new Map() }

  for (const entryPath of paths) {
    let node = root
    for (const segment of entryPath.split('/')) {
      if (!node.children.has(segment))
        node.children.set(segment, { terminal: false, children: new Map() })
      node = node.children.get(segment)
    }
    node.terminal = true
  }

  return root
}

function hasAncestorOrDescendantPath(pathTrie, entryPath) {
  let node = pathTrie
  for (const segment of entryPath.split('/')) {
    if (node.terminal)
      return true
    node = node.children.get(segment)
    if (!node)
      return false
  }

  return node.terminal || node.children.size > 0
}

/**
 * Builds a plan in dependency order without comparing every copy/delete pair:
 * 1. index selected copy paths in a trie;
 * 2. classify deleted paths that are ancestors or descendants of a copy as
 *    structural conflicts;
 * 3. require those conflict deletions to be selected explicitly;
 * 4. order operations as conflict deletions, copies, then ordinary deletions.
 */
export function buildSyncPlan(diffSnapshot, reviewResult) {
  if (!reviewResult || reviewResult.action !== 'confirm') {
    return {
      action: 'cancel',
      operations: [],
    }
  }

  if (!reviewResult.selectedPaths)
    reviewResult.selectedPaths = collectAllFilePaths(diffSnapshot)

  const selectedPathSet = new Set(reviewResult.selectedPaths || [])
  const copyOperations = []
  const deleteOperations = []
  const allDeletedEntries = []

  for (const fileEntry of diffSnapshot.files) {
    if (fileEntry.state === DiffState.deleted)
      allDeletedEntries.push(fileEntry)

    if (!isPathSelected(fileEntry.path, selectedPathSet))
      continue

    if (fileEntry.state === DiffState.added || fileEntry.state === DiffState.modified)
      copyOperations.push({ type: 'copy', path: fileEntry.path })
    else if (fileEntry.state === DiffState.deleted)
      deleteOperations.push({ type: 'delete', path: fileEntry.path })
  }

  copyOperations.sort((left, right) => left.path.localeCompare(right.path))
  deleteOperations.sort((left, right) => left.path.localeCompare(right.path))

  const copyPathTrie = createPathTrie(copyOperations.map(operation => operation.path))
  const selectedDeletePathSet = new Set(deleteOperations.map(operation => operation.path))
  const preCopyDeletePathSet = new Set()

  for (const fileEntry of allDeletedEntries) {
    if (!hasAncestorOrDescendantPath(copyPathTrie, fileEntry.path))
      continue

    if (!selectedDeletePathSet.has(fileEntry.path)) {
      throw new Error(
        `Selected copy operations require selecting the structural conflict deletion: ${fileEntry.path}`,
      )
    }
    preCopyDeletePathSet.add(fileEntry.path)
  }

  const preCopyDeleteOperations = deleteOperations
    .filter(operation => preCopyDeletePathSet.has(operation.path))
  const postCopyDeleteOperations = deleteOperations
    .filter(operation => !preCopyDeletePathSet.has(operation.path))

  return {
    action: 'confirm',
    operations: [
      ...preCopyDeleteOperations,
      ...copyOperations,
      ...postCopyDeleteOperations,
    ],
  }
}
