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

  for (const fileEntry of diffSnapshot.files) {
    if (!isPathSelected(fileEntry.path, selectedPathSet))
      continue

    if (fileEntry.state === DiffState.added || fileEntry.state === DiffState.modified)
      copyOperations.push({ type: 'copy', path: fileEntry.path })
    else if (fileEntry.state === DiffState.deleted)
      deleteOperations.push({ type: 'delete', path: fileEntry.path })
  }

  copyOperations.sort((left, right) => left.path.localeCompare(right.path))
  deleteOperations.sort((left, right) => left.path.localeCompare(right.path))

  return {
    action: 'confirm',
    operations: [
      ...copyOperations,
      ...deleteOperations,
    ],
  }
}
