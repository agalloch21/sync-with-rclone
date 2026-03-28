/** @typedef {import('../../types/snapshot.d.ts').Snapshot} Snapshot */
import fs from 'node:fs/promises'
import path from 'node:path'

export async function buildSnapshot(rootAbsPath) {
  if (!path.isAbsolute(rootAbsPath)) {
    throw new Error(`Input must be an absolute path. ${rootAbsPath}`)
  }

  const rootStat = await fs.stat(rootAbsPath)
  if (!rootStat.isDirectory()) {
    throw new Error(`Input must be a directory. ${rootAbsPath}`)
  }

  rootAbsPath = rootAbsPath.replaceAll(path.sep, path.posix.sep)

  /** @type {Snapshot} */
  const snapshot = {
    root: rootAbsPath,
    fileEntries: new Map(),
    dirEntries: new Map([
      ['.', { parent: null, children: new Map() }],
    ]),
  }

  await walkDir('.', snapshot)

  return snapshot
}

async function walkDir(dirPath, snapshot) {
  const entries = await fs.readdir(path.posix.join(snapshot.root, dirPath))

  for (const entryName of entries) {
    const entryPath = path.posix.join(dirPath, entryName)
    const stat = await fs.stat(path.posix.join(snapshot.root, entryPath))

    if (stat.isFile()) {
      // Add to fileEntries
      snapshot.fileEntries.set(entryPath, {
        parent: dirPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      })

      // Push to the child list
      snapshot.dirEntries.get(dirPath).children.set(entryName, { path: entryPath, type: 'file' })
    }
    else if (stat.isDirectory()) {
      // Add to dirEntries
      snapshot.dirEntries.set(entryPath, {
        parent: dirPath,
        children: new Map(),
      })

      // Push to the child list
      snapshot.dirEntries.get(dirPath).children.set(entryName, { path: entryPath, type: 'dir' })

      // Walk into subfolder
      await walkDir(entryPath, snapshot)
    }
  }
}
