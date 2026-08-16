import assert from 'node:assert/strict'
import test from 'node:test'
import { compareSnapshots } from '#src/core/snapshots/compare-snapshots.js'
import { createEmptySnapshot, DiffState } from '#src/core/snapshots/snapshot.js'

test('compareSnapshots treats one-second mtime precision differences as unchanged when size is equal', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  srcSnapshot.files.push({ path: 'file.txt', size: 123, mtimeMs: 1999.75 })
  dstSnapshot.files.push({ path: 'file.txt', size: 123, mtimeMs: 1000 })

  const diffSnapshot = compareSnapshots(srcSnapshot, dstSnapshot)
  assert.deepEqual(diffSnapshot.files, [])
  assert.deepEqual(diffSnapshot.summary, { modified: 0, added: 0, deleted: 0 })
})

test('compareSnapshots marks same-size files modified when mtime differs beyond one second', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  srcSnapshot.files.push({ path: 'file.txt', size: 123, mtimeMs: 2001 })
  dstSnapshot.files.push({ path: 'file.txt', size: 123, mtimeMs: 1000 })

  const diffSnapshot = compareSnapshots(srcSnapshot, dstSnapshot)
  assert.deepEqual(diffSnapshot.files, [
    { path: 'file.txt', size: 123, mtimeMs: 2001, state: DiffState.modified },
  ])
  assert.deepEqual(diffSnapshot.summary, { modified: 1, added: 0, deleted: 0 })
})

test('compareSnapshots marks added, modified, and deleted files', () => {
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

  const diffSnapshot = compareSnapshots(srcSnapshot, dstSnapshot)
  assert.deepEqual(diffSnapshot.files, [
    { path: 'added.txt', size: 1, mtimeMs: 1, state: DiffState.added },
    { path: 'deleted.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
    { path: 'modified.txt', size: 124, mtimeMs: 1000.75, state: DiffState.modified },
  ])
  assert.deepEqual(diffSnapshot.summary, { modified: 1, added: 1, deleted: 1 })
})

test('compareSnapshots treats files omitted from one snapshot as ordinary differences', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  dstSnapshot.files.push(
    { path: 'local-link', size: 1, mtimeMs: 1 },
    { path: 'ignored-directory/nested.txt', size: 1, mtimeMs: 1 },
  )

  assert.deepEqual(compareSnapshots(srcSnapshot, dstSnapshot).files, [
    { path: 'ignored-directory/nested.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
    { path: 'local-link', size: 1, mtimeMs: 1, state: DiffState.deleted },
  ])
  assert.deepEqual(compareSnapshots(dstSnapshot, srcSnapshot).files, [
    { path: 'ignored-directory/nested.txt', size: 1, mtimeMs: 1, state: DiffState.added },
    { path: 'local-link', size: 1, mtimeMs: 1, state: DiffState.added },
  ])
})
