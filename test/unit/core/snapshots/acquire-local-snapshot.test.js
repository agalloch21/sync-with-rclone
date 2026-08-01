import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { buildLocalSnapshot } from '#src/core/snapshots/acquire-snapshots.js'

function filePaths(snapshot) {
  return snapshot.files.map(file => file.path)
}

test('buildLocalSnapshot emits a serializable file-only snapshot', async () => {
  const rootPath = path.posix.resolve('test/fixtures/local/nested')
  const snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(path.posix.isAbsolute(snapshot.root))
  assert.ok(Array.isArray(snapshot.files))
  assert.ok(filePaths(snapshot).includes('folder-a/a.txt'))
  assert.ok(filePaths(snapshot).includes('deeper-nested/nested-a.txt'))
  assert.equal('dirEntries' in snapshot, false)
  assert.equal('fileEntries' in snapshot, false)
  assert.doesNotThrow(() => JSON.stringify(snapshot))
})

test('buildLocalSnapshot omits empty directories', async () => {
  const rootPath = path.posix.resolve('test/fixtures/local/empty')
  const snapshot = await buildLocalSnapshot(rootPath)

  assert.deepEqual(snapshot.files, [])
})

test('buildLocalSnapshot preserves ignored-directory pruning', async () => {
  let rootPath = path.posix.resolve('test/fixtures/local/basic')
  let snapshot = await buildLocalSnapshot(rootPath)

  assert.equal(filePaths(snapshot).some(filePath => filePath.startsWith('node_modules/')), false)

  rootPath = path.posix.resolve('test/fixtures/local/noignore')
  snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(filePaths(snapshot).includes('node_modules/index.txt'))
})

test('buildLocalSnapshot applies nested ignore and negation patterns', async () => {
  let rootPath = path.posix.resolve('test/fixtures/local/nested')
  let snapshot = await buildLocalSnapshot(rootPath)

  assert.equal(filePaths(snapshot).some(filePath => filePath.startsWith('deeper-nested/folder-a/')), false)
  assert.equal(filePaths(snapshot).some(filePath => filePath.startsWith('deeper-nested/folder-b/')), false)
  assert.ok(filePaths(snapshot).includes('folder-a/a.txt'))

  rootPath = path.posix.resolve('test/fixtures/local/negate')
  snapshot = await buildLocalSnapshot(rootPath)

  assert.equal(filePaths(snapshot).includes('.env.simple'), false)
  assert.ok(filePaths(snapshot).includes('.env.example'))
  assert.equal(filePaths(snapshot).includes('.yarn/yarn-file'), false)
  assert.ok(filePaths(snapshot).includes('.yarn/patches/patch-file'))
})

test('buildLocalSnapshot skips symbolic links without following their targets', async (t) => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-local-symlinks-'))

  try {
    await fs.mkdir(path.join(rootPath, 'real-directory'))
    await fs.writeFile(path.join(rootPath, 'real-file.txt'), 'file')
    await fs.writeFile(path.join(rootPath, 'real-directory', 'nested.txt'), 'nested')

    try {
      await fs.symlink('real-file.txt', path.join(rootPath, 'file-link'))
      await fs.symlink('real-directory', path.join(rootPath, 'directory-link'), 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    const snapshot = await buildLocalSnapshot(rootPath)

    assert.deepEqual(filePaths(snapshot), [
      'real-directory/nested.txt',
      'real-file.txt',
    ])
  }
  finally {
    await fs.rm(rootPath, { recursive: true, force: true })
  }
})

test('buildLocalSnapshot rejects a symbolic link as its sync root', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-root-symlink-'))
  const directoryPath = path.join(temporaryPath, 'directory')
  const linkPath = path.join(temporaryPath, 'directory-link')

  try {
    await fs.mkdir(directoryPath)
    try {
      await fs.symlink(directoryPath, linkPath, 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    await assert.rejects(
      () => buildLocalSnapshot(linkPath),
      /Symbolic link sync roots are not supported/,
    )
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})
