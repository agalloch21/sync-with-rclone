import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { buildLocalSnapshot } from '#src/infrastructure/filesystem/build-local-snapshot.js'

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
