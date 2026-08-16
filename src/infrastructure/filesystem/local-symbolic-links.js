import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Finds existing internal symbolic-link boundaries for local relative paths.
 * Sets cache every observed prefix so large plans do not repeat filesystem
 * queries for shared ancestors.
 */
export async function findLocalSymbolicLinkConflicts(
  rootAbsPath,
  relativePaths,
  cancelSignal = null,
) {
  const conflicts = new Map()
  const safePaths = new Set()
  const missingPaths = new Set()
  const nonDirectoryPaths = new Set()
  const symbolicLinkPaths = new Set()

  for (const relativePath of relativePaths) {
    let currentPath = rootAbsPath
    const traversedSegments = []
    const segments = relativePath.split('/').filter(Boolean)

    for (const [index, segment] of segments.entries()) {
      cancelSignal?.throwIfAborted()
      traversedSegments.push(segment)
      currentPath = path.join(currentPath, segment)
      const traversedPath = traversedSegments.join('/')

      if (symbolicLinkPaths.has(traversedPath)) {
        conflicts.set(relativePath, { symbolicLinkPath: traversedPath })
        break
      }
      if (missingPaths.has(traversedPath) || nonDirectoryPaths.has(traversedPath))
        break
      if (safePaths.has(traversedPath))
        continue

      let stat
      try {
        stat = await fs.lstat(currentPath)
      }
      catch (error) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
          missingPaths.add(traversedPath)
          break
        }
        throw error
      }

      if (stat.isSymbolicLink()) {
        symbolicLinkPaths.add(traversedPath)
        conflicts.set(relativePath, { symbolicLinkPath: traversedPath })
        break
      }

      safePaths.add(traversedPath)
      if (!stat.isDirectory() && index < segments.length - 1) {
        nonDirectoryPaths.add(traversedPath)
        break
      }
    }
  }

  return conflicts
}
