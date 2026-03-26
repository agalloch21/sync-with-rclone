/** @typedef {import('../../types/snapshot.d.ts').Snapshot} Snapshot */
import fs from 'node:fs/promises'
import path from 'node:path'

export async function buildSnapshot(rootDir) {
  if (!path.isAbsolute(rootDir)) {
    throw new Error(`Input must be an absolute path. ${rootDir}`)
  }

  const rootStat = await fs.stat(rootDir)
  if (!rootStat.isDirectory()) {
    throw new Error(`Input must be a directory. ${rootDir}`)
  }

  rootDir = rootDir.replaceAll(path.sep, path.posix.sep)

  /** @type {Snapshot} */
  const snapshot = {
    root: rootDir,
    entriesByPath: new Map(),
    childrenByPath: new Map(),
  }

  await walkDir(rootDir, '.', snapshot)

  return snapshot
}

async function walkDir(basePath, dirPath, snapshot) {
  const entries = await fs.readdir(path.posix.join(basePath, dirPath))

  // Add child tree
  snapshot.childrenByPath.set(dirPath, entries)

  for (const entry of entries) {
    const entryPath = path.posix.join(dirPath, entry)

    // Read status of the entry
    const stat = await fs.stat(path.posix.join(basePath, entryPath))
    if (stat.isDirectory()) {
      snapshot.entriesByPath.set(entryPath, {
        path: entryPath,
        type: 'dir',
      })

      await walkDir(basePath, entryPath, snapshot)
    }
    else if (stat.isFile()) {
      snapshot.entriesByPath.set(entryPath, {
        path: entryPath,
        type: 'file',
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      })
    }
    else {
      // todo: not support yet
    }
  }
}
