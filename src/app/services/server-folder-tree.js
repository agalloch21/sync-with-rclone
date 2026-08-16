import { normalizeLocalPath, trimTrailingSlash } from '#src/infrastructure/filesystem/local-path.js'

function normalizeFolderPath(inputPath = '') {
  return trimTrailingSlash(normalizeLocalPath(String(inputPath)).replace(/^\/+/, ''))
}

function createFolderNode(name, path, children = null) {
  return {
    type: 'directory',
    name,
    path,
    children,
  }
}

export function buildServerFolderTree(serverName, entries = [], folderPath = '') {
  const basePath = normalizeFolderPath(folderPath)
  const rootName = basePath.split('/').at(-1) || serverName
  const root = createFolderNode(rootName, basePath, [])
  const nodesByPath = new Map([[basePath, root]])

  const paths = entries
    .filter(entry => entry?.IsDir === true)
    .map(entry => normalizeFolderPath(entry?.Path || entry?.Name || ''))
    .filter(Boolean)
    .map(entryPath => basePath && entryPath !== basePath && !entryPath.startsWith(`${basePath}/`)
      ? `${basePath}/${entryPath}`
      : entryPath)
    .sort((left, right) => left.localeCompare(right))

  for (const entryPath of paths) {
    const relativePath = basePath ? entryPath.slice(basePath.length).replace(/^\/+/, '') : entryPath
    const segments = relativePath.split('/').filter(Boolean)
    let parentPath = basePath

    for (const segment of segments) {
      const nodePath = parentPath ? `${parentPath}/${segment}` : segment
      if (!nodesByPath.has(nodePath)) {
        const node = createFolderNode(segment, nodePath)
        nodesByPath.set(nodePath, node)
        const parentNode = nodesByPath.get(parentPath)
        parentNode.children ??= []
        parentNode.children.push(node)
      }
      parentPath = nodePath
    }
  }

  for (const node of nodesByPath.values()) {
    if (node.children)
      node.children.sort((left, right) => left.name.localeCompare(right.name))
  }

  return root
}
