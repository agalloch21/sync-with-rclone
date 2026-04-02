import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { buildLocalSnapshot } from '#src/core/build-local-snapshot.js'

test('test buildLocalSnapshot: format validation', async () => {
  // root, fileEntries, dirEntries
  let rootPath = path.posix.resolve('test/fixtures/local/basic')
  let snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(path.posix.isAbsolute(snapshot.root) === true)
  assert.ok(snapshot.dirEntries?.size > 0)
  assert.ok(snapshot.fileEntries?.size > 0)

  // proper relationship
  rootPath = path.posix.resolve('test/fixtures/local/nested')
  snapshot = await buildLocalSnapshot(rootPath)
  assert.ok(snapshot.dirEntries.get('.').children.has('folder-a') === true)
  assert.ok(snapshot.dirEntries.get('folder-a').children.has('a.txt') === true)
  assert.ok(snapshot.dirEntries.get('deeper-nested').children.has('nested-a.txt') === true)

  // empty folder
  rootPath = path.posix.resolve('test/fixtures/local/empty')
  snapshot = await buildLocalSnapshot(rootPath)
  assert.ok(snapshot.fileEntries.size === 0)
  assert.ok(snapshot.dirEntries.get('.').children.size === 0)

  // no .gitignore folder
  rootPath = path.posix.resolve('test/fixtures/local/noignore')
  snapshot = await buildLocalSnapshot(rootPath)
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules'))
  assert.ok(snapshot.dirEntries.get('node_modules').children.has('index.txt'))
})

test('test buildLocalSnapshot: result validation', async () => {
  // filter normal
  let rootPath = path.posix.resolve('test/fixtures/local/basic')
  let snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(snapshot.dirEntries.has('node_modules') === false)
  assert.ok(snapshot.dirEntries.has('node_modules/module-a') === false)
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules') === false)

  // filter nested
  rootPath = path.posix.resolve('test/fixtures/local/nested')
  snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(snapshot.dirEntries.has('deeper-nested/folder-a') === false)
  assert.ok(snapshot.dirEntries.has('deeper-nested/folder-b') === false)
  assert.ok(snapshot.dirEntries.has('folder-a') === true)
  assert.ok(snapshot.fileEntries.has('folder-a/a.txt') === true)

  // no .gitignore file
  rootPath = path.posix.resolve('test/fixtures/local/noignore')
  snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(snapshot.fileEntries.has('node_modules/index.txt'))
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules'))

  // negate
  rootPath = path.posix.resolve('test/fixtures/local/negate')
  snapshot = await buildLocalSnapshot(rootPath)

  assert.ok(snapshot.fileEntries.has('.env.simple') === false)
  assert.ok(snapshot.fileEntries.has('.env.example') === true)
  assert.ok(snapshot.fileEntries.has('.yarn/yarn-file') === false)
  assert.ok(snapshot.fileEntries.has('.yarn/patches/patch-file') === true)

  // return false due to the node-ignore bug
//   assert.ok(snapshot.fileEntries.has('nested-negate/folder-a/nested-folder-a-file') === true)
})
