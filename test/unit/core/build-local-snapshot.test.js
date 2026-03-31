import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { buildLocalSnapshot } from '#src/core/build-local-snapshot.js'

test('test buildLocalSnapshot', async () => {
  // filter root
  let rootPath = path.posix.resolve('test/fixtures/ignore/basic')
  let snapshot = await buildLocalSnapshot(rootPath)

  console.log(snapshot)
  assert.ok(snapshot.dirEntries.has('node_modules') === false)
  assert.ok(snapshot.dirEntries.has('node_modules/module-a') === false)
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules') === false)

  // filter nested
  rootPath = path.posix.resolve('test/fixtures/ignore/nested')
  snapshot = await buildLocalSnapshot(rootPath)

  console.log(snapshot)
  assert.ok(snapshot.dirEntries.has('deeper-nested/folder-a') === false)
  assert.ok(snapshot.dirEntries.has('deeper-nested/folder-b') === false)
  assert.ok(snapshot.dirEntries.has('folder-a') === true)
  assert.ok(snapshot.fileEntries.has('folder-a/a.txt') === true)

  // no .gitignore file
  rootPath = path.posix.resolve('test/fixtures/ignore/noignore')
  snapshot = await buildLocalSnapshot(rootPath)

  console.log(snapshot)
  assert.ok(snapshot.fileEntries.has('node_modules/index.txt'))
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules'))

  // negate
  rootPath = path.posix.resolve('test/fixtures/ignore/negate')
  snapshot = await buildLocalSnapshot(rootPath)

  console.log(snapshot)
  assert.ok(snapshot.fileEntries.has('.env.simple') === false)
  assert.ok(snapshot.fileEntries.has('.env.example') === true)
  assert.ok(snapshot.fileEntries.has('.yarn/yarn-file') === false)
  assert.ok(snapshot.fileEntries.has('.yarn/patches/patch-file') === true)

  // return false due to the node-ignore bug
//   assert.ok(snapshot.fileEntries.has('nested-negate/folder-a/nested-folder-a-file') === true)
})
