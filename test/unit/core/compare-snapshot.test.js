import assert from 'node:assert/strict'
import test from 'node:test'
import { compareSnapshot } from '#src/core/compare-snapshot.js'
import { createEmptySnapshot } from '#src/core/snapshot.js'

test('compareSnapshot treats sub-millisecond mtime differences as unchanged when size is equal', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  srcSnapshot.dirEntries.get('.').children.set('file.txt', { path: 'file.txt', isDir: false })
  dstSnapshot.dirEntries.get('.').children.set('file.txt', { path: 'file.txt', isDir: false })
  srcSnapshot.fileEntries.set('file.txt', {
    parent: '.',
    size: 123,
    mtimeMs: 1000.75,
  })
  dstSnapshot.fileEntries.set('file.txt', {
    parent: '.',
    size: 123,
    mtimeMs: 1000,
  })

  const diffSnapshot = compareSnapshot(srcSnapshot, dstSnapshot)
  assert.equal(diffSnapshot.fileEntries.has('file.txt'), false)
})

test('compareSnapshot still marks files as modified when size differs', () => {
  const srcSnapshot = createEmptySnapshot('/src-root')
  const dstSnapshot = createEmptySnapshot('/dst-root')

  srcSnapshot.dirEntries.get('.').children.set('file.txt', { path: 'file.txt', isDir: false })
  dstSnapshot.dirEntries.get('.').children.set('file.txt', { path: 'file.txt', isDir: false })
  srcSnapshot.fileEntries.set('file.txt', {
    parent: '.',
    size: 124,
    mtimeMs: 1000.75,
  })
  dstSnapshot.fileEntries.set('file.txt', {
    parent: '.',
    size: 123,
    mtimeMs: 1000,
  })

  const diffSnapshot = compareSnapshot(srcSnapshot, dstSnapshot)
  assert.equal(diffSnapshot.fileEntries.get('file.txt')?.state, 1)
})
