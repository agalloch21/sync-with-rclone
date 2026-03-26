import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { collectPatterns, filterEntries, gatherChildrenKeys, locateDirectories } from '#src/modules/ignore/git-adapter.js'

const snapshot = {
  root: '/demo/root',
  entriesByPath: new Map([
    ['.gitignore', { type: 'file', path: '.gitignore', size: 10, mtimeMs: 1 }],
    ['src/index.js', { type: 'file', path: 'src/index.js', size: 20, mtimeMs: 1 }],
    ['node_modules', { type: 'dir', path: 'node_modules' }],
    ['node_modules/a.js', { type: 'file', path: 'node_modules/a.js', size: 20, mtimeMs: 1 }],
    ['nested', { type: 'dir', path: 'nested' }],
    ['nested/.gitignore', { type: 'file', path: 'nested/.gitignore', size: 10, mtimeMs: 1 }],
    ['nested/b.js', { type: 'file', path: 'nested/b.js', size: 10, mtimeMs: 1 }],
    ['nested/deeper-nested', { type: 'dir', path: 'nested/deeper-nested' }],
    ['nested/deeper-nested/.gitignore', { type: 'file', path: 'nested/deeper-nested/.gitignore', size: 10, mtimeMs: 1 }],
    ['nested/deeper-nested/c.js', { type: 'file', path: 'nested/deeper-nested/c.js', size: 10, mtimeMs: 1 }],
  ]),
  childrenByPath: new Map([
    ['.', ['.gitignore', 'src', 'node_modules', 'nested']],
    ['src', ['index.js']],
    ['node_modules', ['a.js']],
    ['nested', ['.gitignore', 'b.js', 'deeper-nested']],
    ['nested/deeper-nested', ['.gitignore', 'c.js']],
  ]),
}

test('test locateDirectories', () => {
  const dirs = locateDirectories(snapshot)
  assert.ok(dirs.includes('.') && dirs.includes('nested') && dirs.includes('nested/deeper-nested'))
})

test('test reading patterns: input path must be valid and absolute', async () => {
  // can not be empty
  await assert.rejects(() => collectPatterns(''))

  // must exsit
  const rootPath = path.resolve('test/fixtures/ignore')
  await assert.rejects(() => collectPatterns(path.join(rootPath, 'folder-does-not-exist', '.gitignore')))

  // can not be a directory
  await assert.rejects(() => collectPatterns(rootPath))
})

test('test reading patterns: return empty array if the file is empty', async () => {
  assert.equal((await collectPatterns(path.resolve('test/fixtures/ignore/basic/.gitignore-empty'))).length, 0)
})

test('test reading patterns: delete comments and duplicated lines', async () => {
  assert.deepStrictEqual(await collectPatterns(path.resolve('test/fixtures/ignore/basic/.gitignore-with-comment')), ['node_modules'])

  assert.deepStrictEqual(await collectPatterns(path.resolve('test/fixtures/ignore/basic/.gitignore-with-duplicated')), ['node_modules', '[Ll]ogs', 'Logs'])
})

test('test assemble entries: the input path is invalid', () => {
  // the folder is empty which means the snapshot is minimum
  const snapshotEmpty = {
    root: '/demo/root',
    entriesByPath: new Map([]),
    childrenByPath: new Map([
      ['.', []],
    ]),
  }
  assert.equal(gatherChildrenKeys('.', snapshotEmpty).length, 0)

  // the path is directing to a file
  assert.throws(() => {
    gatherChildrenKeys('src/index.js', snapshot)
  })
  // the path is not in snapshot
  assert.throws(() => {
    gatherChildrenKeys('dir-does-not-exist', snapshot)
  })
})

test('test assemble entries: assemble all the entries under the root', () => {
  let entriesUnderRoot = gatherChildrenKeys('.', snapshot)
  assert.equal(entriesUnderRoot.length, snapshot.entriesByPath.size)

  // has trailing /
  entriesUnderRoot = gatherChildrenKeys('./', snapshot)
  assert.equal(entriesUnderRoot.length, snapshot.entriesByPath.size)
})

test('test assemble entries: assemble the entries in the nested dir only', () => {
  let nestedPath = 'nested'
  let entriesUnderNested = gatherChildrenKeys(nestedPath, snapshot)
  const destEntries = Array.from(snapshot.entriesByPath.keys()).filter(k => k.startsWith(`${nestedPath}/`))
  assert.equal(entriesUnderNested.length, destEntries.length)

  nestedPath = 'nested' + '/'
  entriesUnderNested = gatherChildrenKeys(nestedPath, snapshot)
  assert.equal(entriesUnderNested.length, destEntries.length)

  nestedPath = 'nested' + '\\'
  entriesUnderNested = gatherChildrenKeys(nestedPath, snapshot)
  assert.equal(entriesUnderNested.length, destEntries.length)
})

test('test ignore filter: basic', () => {
  const entries = Array.from(snapshot.entriesByPath.keys()).map((p) => {
    if (snapshot.entriesByPath.get(p).type === 'dir')
      return `${p}/`
    return p
  })
  const patterns = ['node_modules/']
  const filtered = filterEntries(entries, patterns)
  const matched = entries.filter(p => p.includes('node_modules'))

  assert.equal(filtered.filter(p => p.includes('node_modules')).length, 0)
  assert.equal(entries.length - filtered.length, matched.length)
})
