import { DiffState } from '#src/types/snapshot.js'

function isPathSelected(entryPath, selectedPathSet) {
  for (const selectedPath of selectedPathSet) {
    if (entryPath === selectedPath || entryPath.startsWith(`${selectedPath}/`))
      return true
  }
  return false
}

export function buildSyncPlan(diffSnapshot, reviewResult) {
  if (!reviewResult || reviewResult.action !== 'confirm') {
    return {
      action: 'cancel',
      operations: [],
    }
  }

  const selectedPathSet = new Set(reviewResult.selectedPaths || [])
  const mkdirOperations = []
  const copyOperations = []
  const deleteOperations = []
  const rmdirOperations = []

  for (const [entryPath, dirEntry] of diffSnapshot.dirEntries) {
    if (entryPath === '.' || !isPathSelected(entryPath, selectedPathSet))
      continue

    if (dirEntry.state === DiffState.added)
      mkdirOperations.push({ type: 'mkdir', path: entryPath })
    else if (dirEntry.state === DiffState.deleted)
      rmdirOperations.push({ type: 'rmdir', path: entryPath })
  }

  for (const [entryPath, fileEntry] of diffSnapshot.fileEntries) {
    if (!isPathSelected(entryPath, selectedPathSet))
      continue

    if (fileEntry.state === DiffState.added || fileEntry.state === DiffState.modified)
      copyOperations.push({ type: 'copy', path: entryPath })
    else if (fileEntry.state === DiffState.deleted)
      deleteOperations.push({ type: 'delete', path: entryPath })
  }

  mkdirOperations.sort((left, right) => left.path.localeCompare(right.path))
  copyOperations.sort((left, right) => left.path.localeCompare(right.path))
  deleteOperations.sort((left, right) => left.path.localeCompare(right.path))
  rmdirOperations.sort((left, right) => {
    const depthDiff = right.path.split('/').length - left.path.split('/').length
    return depthDiff || right.path.localeCompare(left.path)
  })

  return {
    action: 'confirm',
    operations: [
      ...mkdirOperations,
      ...copyOperations,
      ...deleteOperations,
      ...rmdirOperations,
    ],
  }
}
