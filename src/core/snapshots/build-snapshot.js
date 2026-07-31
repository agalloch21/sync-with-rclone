import { addFileToSnapshot, createEmptySnapshot, sortFilesByPath } from './snapshot.js'

export function buildSnapshot(root, fileEntries = []) {
  const snapshot = createEmptySnapshot(root)

  for (const entry of fileEntries)
    addFileToSnapshot(snapshot, entry.path, entry.size, entry.mtimeMs)

  sortFilesByPath(snapshot.files)
  return snapshot
}
