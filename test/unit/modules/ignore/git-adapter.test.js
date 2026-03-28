import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { gitAdapter } from '#src/modules/ignore/git-adapter.js'
import { buildSnapshot } from '#src/modules/scan/build-snapshot.js'

// const snapshot = {
//   root: '/demo/root',
//   entriesByPath: new Map([
//     ['.gitignore', { type: 'file', path: '.gitignore', size: 10, mtimeMs: 1 }],
//     ['src/index.js', { type: 'file', path: 'src/index.js', size: 20, mtimeMs: 1 }],
//     ['node_modules', { type: 'dir', path: 'node_modules' }],
//     ['node_modules/a.js', { type: 'file', path: 'node_modules/a.js', size: 20, mtimeMs: 1 }],
//     ['nested', { type: 'dir', path: 'nested' }],
//     ['nested/.gitignore', { type: 'file', path: 'nested/.gitignore', size: 10, mtimeMs: 1 }],
//     ['nested/b.js', { type: 'file', path: 'nested/b.js', size: 10, mtimeMs: 1 }],
//     ['nested/deeper-nested', { type: 'dir', path: 'nested/deeper-nested' }],
//     ['nested/deeper-nested/.gitignore', { type: 'file', path: 'nested/deeper-nested/.gitignore', size: 10, mtimeMs: 1 }],
//     ['nested/deeper-nested/c.js', { type: 'file', path: 'nested/deeper-nested/c.js', size: 10, mtimeMs: 1 }],
//   ]),
//   childrenByPath: new Map([
//     ['.', ['.gitignore', 'src', 'node_modules', 'nested']],
//     ['src', ['index.js']],
//     ['node_modules', ['a.js']],
//     ['nested', ['.gitignore', 'b.js', 'deeper-nested']],
//     ['nested/deeper-nested', ['.gitignore', 'c.js']],
//   ]),
// }

// test('test locateDirectories', () => {
//   const dirs = locateDirectories(snapshot)
//   assert.ok(dirs.includes('.') && dirs.includes('nested') && dirs.includes('nested/deeper-nested'))
// })

// test('test filterDirectory: input validation', async () => {
//   // folder does not exist
//   await assert.rejects(() => filterDirectory('folder-does-not-exist', snapshot))

//   // empty folder
//   // the folder is empty which means the snapshot is minimum
//   const snapshotEmpty = {
//     root: '/demo/root',
//     entriesByPath: new Map([]),
//     childrenByPath: new Map([
//       ['.', []],
//     ]),
//   }
//   assert.equal((await filterDirectory('.', snapshotEmpty)).length, 0)

//   // file
//   await assert.rejects(() => filterDirectory('src/index.js', snapshot))
// })

// test('test filterDirectory: result validation', async () => {
//   // filter root
//   let rootPath = path.posix.resolve('test/fixtures/ignore/basic')
//   let snapshot = await buildSnapshot(rootPath)
//   let filtered = await filterDirectory('.', snapshot)
//   assert.ok(filtered.includes('node_modules') === false)

//   // filter nested
//   rootPath = path.posix.resolve('test/fixtures/ignore/nested')
//   snapshot = await buildSnapshot(rootPath)
//   filtered = await filterDirectory('.', snapshot)
//   assert.ok(filtered.includes('folder-b') === false)
//   assert.ok(filtered.includes('deeper-nested/folder-b') === false)
//   assert.ok(filtered.includes('deeper-nested/folder-a') === true)

//   rootPath = path.posix.resolve('test/fixtures/ignore/nested')
//   snapshot = await buildSnapshot(rootPath)
//   filtered = await filterDirectory('deeper-nested', snapshot)
//   assert.ok(filtered.includes('deeper-nested/folder-a') === false)

//   // no .gitignore file
//   rootPath = path.posix.resolve('test/fixtures/ignore/noignore')
//   snapshot = await buildSnapshot(rootPath)
//   filtered = await filterDirectory('.', snapshot)
//   assert.equal(filtered.length, 4)

//   // negate
//   rootPath = path.posix.resolve('test/fixtures/ignore/negate')
//   snapshot = await buildSnapshot(rootPath)
//   filtered = await filterDirectory('.', snapshot)
//   assert.ok(filtered.includes('.env.simple') === false)
//   assert.ok(filtered.includes('.env.example') === true)
//   assert.ok(filtered.includes('.yarn/yarn-file') === false)
//   assert.ok(filtered.includes('.yarn/patches/patch-file') === true)

//   filtered = await filterDirectory('nested-negate', snapshot)
//   assert.ok(filtered.includes('nested-negate/folder-a/nested-folder-a-file') === true)
// })

// test('test gitAdapter', async () => {
// // filter root
//   let rootPath = path.posix.resolve('test/fixtures/ignore/basic')
//   let snapshot = await buildSnapshot(rootPath)
//   snapshot = await gitAdapter.apply(snapshot)
//   assert.ok(snapshot.entriesByPath.has('node_modules') === false)
//   assert.ok(snapshot.entriesByPath.has('node_modules/module-a') === false)
//   assert.ok(snapshot.childrenByPath.has('node_modules') === false)
//   assert.ok(snapshot.childrenByPath.has('node_modules/module-a') === false)

//   // filter nested
//   rootPath = path.posix.resolve('test/fixtures/ignore/nested')
//   snapshot = await buildSnapshot(rootPath)
//   snapshot = await gitAdapter.apply(snapshot)
//   console.log(snapshot)
//   assert.ok(snapshot.entriesByPath.has('deeper-nested/folder-a') === false)
//   assert.ok(snapshot.entriesByPath.has('deeper-nested/folder-b') === false)
//   assert.ok(snapshot.entriesByPath.has('folder-a') === true)

//   assert.ok(snapshot.childrenByPath.has('deeper-nested/folder-a') === false)
//   assert.ok(snapshot.childrenByPath.has('deeper-nested/folder-b') === false)
//   assert.ok(snapshot.childrenByPath.has('folder-a') === true)
// })

test('test gitAdapter', async () => {
  // filter root
  let rootPath = path.posix.resolve('test/fixtures/ignore/basic')
  let snapshot = await buildSnapshot(rootPath)

  await gitAdapter.apply(snapshot)
  assert.ok(snapshot.dirEntries.has('node_modules') === false)
  assert.ok(snapshot.dirEntries.has('node_modules/module-a') === false)
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules') === false)

  // filter nested
  rootPath = path.posix.resolve('test/fixtures/ignore/nested')
  snapshot = await buildSnapshot(rootPath)
  await gitAdapter.apply(snapshot)
  assert.ok(snapshot.dirEntries.has('deeper-nested/folder-a') === false)
  assert.ok(snapshot.dirEntries.has('deeper-nested/folder-b') === false)
  assert.ok(snapshot.dirEntries.has('folder-a') === true)

  // no .gitignore file
  rootPath = path.posix.resolve('test/fixtures/ignore/noignore')
  snapshot = await buildSnapshot(rootPath)
  await gitAdapter.apply(snapshot)
  assert.ok(snapshot.fileEntries.has('node_modules/index.txt'))
  assert.ok(snapshot.dirEntries.get('.').children.has('node_modules'))

  // negate
  rootPath = path.posix.resolve('test/fixtures/ignore/negate')
  snapshot = await buildSnapshot(rootPath)
  await gitAdapter.apply(snapshot)
  console.log(snapshot)
  assert.ok(snapshot.fileEntries.has('.env.simple') === false)
  assert.ok(snapshot.fileEntries.has('.env.example') === true)
  assert.ok(snapshot.fileEntries.has('.yarn/yarn-file') === false)
  assert.ok(snapshot.fileEntries.has('.yarn/patches/patch-file') === true)
  assert.ok(snapshot.fileEntries.has('nested-negate/folder-a/nested-folder-a-file') === true)
})
