/** @typedef {import('#src/core/snapshot.js').DiffSnapshot} DiffSnapshot */

import { getDiffStateStr } from './snapshot.js'

function createDirNode(name, dirPath) {
  return {
    type: 'directory',
    name,
    path: dirPath,
    changes: {
      modified: 0,
      added: 0,
      deleted: 0,
    },
    children: [],
  }
}

function incrementChanges(node, stateLabel) {
  if (stateLabel === 'modified')
    node.changes.modified += 1
  else if (stateLabel === 'added')
    node.changes.added += 1
  else if (stateLabel === 'deleted')
    node.changes.deleted += 1
}

function getOrCreateDir(parentNode, dirName, dirPath) {
  let child = parentNode.children.find(node => node.type === 'directory' && node.name === dirName)
  if (!child) {
    child = createDirNode(dirName, dirPath)
    parentNode.children.push(child)
  }
  return child
}

function sortTree(node) {
  node.children.sort((left, right) => {
    if (left.type !== right.type)
      return left.type === 'directory' ? -1 : 1
    return left.name.localeCompare(right.name)
  })

  for (const child of node.children) {
    if (child.type === 'directory')
      sortTree(child)
  }
}

function buildTree(diffSnapshot) {
  const rootEntry = createDirNode('.', '.')

  for (const fileEntry of diffSnapshot.files) {
    const stateLabel = getDiffStateStr(fileEntry.state)
    const parts = fileEntry.path.split('/')
    const fileName = parts.pop()
    let currentNode = rootEntry
    incrementChanges(currentNode, stateLabel)

    for (let index = 0; index < parts.length; index += 1) {
      const dirPath = parts.slice(0, index + 1).join('/')
      currentNode = getOrCreateDir(currentNode, parts[index], dirPath)
      incrementChanges(currentNode, stateLabel)
    }

    currentNode.children.push({
      type: 'file',
      name: fileName,
      path: fileEntry.path,
      state: stateLabel,
      size: fileEntry.size || 0,
      mtimeMs: fileEntry.mtimeMs || 0,
    })
  }

  sortTree(rootEntry)
  return rootEntry
}

/**
 * Convert the diff snapshot into plain JSON for CLI output or UI transport.
 *
 * @export
 * @param {DiffSnapshot} diffSnapshot
 */
export function serializeDiffSnapshot(diffSnapshot) {
  return {
    srcRoot: diffSnapshot.srcRoot,
    dstRoot: diffSnapshot.dstRoot,
    summary: { ...diffSnapshot.summary },
    tree: buildTree(diffSnapshot),
  }
}
