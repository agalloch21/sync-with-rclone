import assert from 'node:assert/strict'
import test from 'node:test'
import { compareSnapshot } from '#src/core/compare-snapshot.js'
import { createEmptySnapshot, DiffState } from '#src/core/snapshot.js'

test('compareSnapshot treats sub-millisecond mtime differences as unchanged when size is equal', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  srcSnapshot.files.push({ path: 'file.txt', size: 123, mtimeMs: 1000.75 })
  dstSnapshot.files.push({ path: 'file.txt', size: 123, mtimeMs: 1000 })

  const diffSnapshot = compareSnapshot(srcSnapshot, dstSnapshot)
  assert.deepEqual(diffSnapshot.files, [])
  assert.deepEqual(diffSnapshot.summary, { modified: 0, added: 0, deleted: 0 })
})

test('compareSnapshot marks added, modified, and deleted files', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  srcSnapshot.files.push(
    { path: 'added.txt', size: 1, mtimeMs: 1 },
    { path: 'modified.txt', size: 124, mtimeMs: 1000.75 },
  )
  dstSnapshot.files.push(
    { path: 'deleted.txt', size: 1, mtimeMs: 1 },
    { path: 'modified.txt', size: 123, mtimeMs: 1000 },
  )

  const diffSnapshot = compareSnapshot(srcSnapshot, dstSnapshot)
  assert.deepEqual(diffSnapshot.files, [
    { path: 'added.txt', size: 1, mtimeMs: 1, state: DiffState.added },
    { path: 'deleted.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
    { path: 'modified.txt', size: 124, mtimeMs: 1000.75, state: DiffState.modified },
  ])
  assert.deepEqual(diffSnapshot.summary, { modified: 1, added: 1, deleted: 1 })
})
