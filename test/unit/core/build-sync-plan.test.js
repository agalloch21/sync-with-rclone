import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSyncPlan } from '#src/core/build-sync-plan.js'
import { createEmptyDiffSnapshot, DiffState } from '#src/core/snapshot.js'

test('buildSyncPlan emits file operations for selected file-level differences', () => {
  const diffSnapshot = createEmptyDiffSnapshot('/src-root', '/dst-root')

  diffSnapshot.dirEntries.set('added', {
    parent: '.',
    children: new Map([
      ['added.txt', { path: 'added/added.txt', isDir: false }],
    ]),
    changes: new Map([[DiffState.added, 1]]),
    state: DiffState.unchanged,
  })
  diffSnapshot.dirEntries.set('modified', {
    parent: '.',
    children: new Map([
      ['modified.txt', { path: 'modified/modified.txt', isDir: false }],
    ]),
    changes: new Map([[DiffState.modified, 1]]),
    state: DiffState.unchanged,
  })
  diffSnapshot.dirEntries.set('deleted', {
    parent: '.',
    children: new Map([
      ['deleted.txt', { path: 'deleted/deleted.txt', isDir: false }],
    ]),
    changes: new Map([[DiffState.deleted, 1]]),
    state: DiffState.unchanged,
  })
  diffSnapshot.dirEntries.get('.').children.set('added', { path: 'added', isDir: true })
  diffSnapshot.dirEntries.get('.').children.set('modified', { path: 'modified', isDir: true })
  diffSnapshot.dirEntries.get('.').children.set('deleted', { path: 'deleted', isDir: true })
  diffSnapshot.fileEntries.set('added/added.txt', {
    parent: 'added',
    size: 1,
    mtimeMs: 1,
    state: DiffState.added,
  })
  diffSnapshot.fileEntries.set('modified/modified.txt', {
    parent: 'modified',
    size: 1,
    mtimeMs: 1,
    state: DiffState.modified,
  })
  diffSnapshot.fileEntries.set('deleted/deleted.txt', {
    parent: 'deleted',
    size: 1,
    mtimeMs: 1,
    state: DiffState.deleted,
  })

  const syncPlan = buildSyncPlan(diffSnapshot, {
    action: 'confirm',
    selectedPaths: ['added', 'modified/modified.txt', 'deleted/deleted.txt'],
  })

  assert.deepEqual(syncPlan, {
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'added/added.txt' },
      { type: 'copy', path: 'modified/modified.txt' },
      { type: 'delete', path: 'deleted/deleted.txt' },
    ],
  })
})

test('buildSyncPlan emits mkdir and rmdir when directory states are explicitly added or deleted', () => {
  const diffSnapshot = createEmptyDiffSnapshot('/src-root', '/dst-root')

  diffSnapshot.dirEntries.set('added-dir', {
    parent: '.',
    children: new Map([
      ['new.txt', { path: 'added-dir/new.txt', isDir: false }],
    ]),
    changes: new Map([[DiffState.added, 1]]),
    state: DiffState.added,
  })
  diffSnapshot.dirEntries.get('.').children.set('added-dir', {
    path: 'added-dir',
    isDir: true,
  })
  diffSnapshot.fileEntries.set('added-dir/new.txt', {
    parent: 'added-dir',
    size: 1,
    mtimeMs: 1,
    state: DiffState.added,
  })

  diffSnapshot.dirEntries.set('deleted-dir', {
    parent: '.',
    children: new Map([
      ['old.txt', { path: 'deleted-dir/old.txt', isDir: false }],
    ]),
    changes: new Map([[DiffState.deleted, 1]]),
    state: DiffState.deleted,
  })
  diffSnapshot.dirEntries.get('.').children.set('deleted-dir', {
    path: 'deleted-dir',
    isDir: true,
  })
  diffSnapshot.fileEntries.set('deleted-dir/old.txt', {
    parent: 'deleted-dir',
    size: 1,
    mtimeMs: 1,
    state: DiffState.deleted,
  })

  const syncPlan = buildSyncPlan(diffSnapshot, {
    action: 'confirm',
    selectedPaths: ['added-dir', 'deleted-dir'],
  })

  assert.deepEqual(syncPlan, {
    action: 'confirm',
    operations: [
      { type: 'mkdir', path: 'added-dir' },
      { type: 'copy', path: 'added-dir/new.txt' },
      { type: 'delete', path: 'deleted-dir/old.txt' },
      { type: 'rmdir', path: 'deleted-dir' },
    ],
  })
})

test('buildSyncPlan returns an empty plan when review is cancelled', () => {
  const diffSnapshot = createEmptyDiffSnapshot('/src-root', '/dst-root')

  const syncPlan = buildSyncPlan(diffSnapshot, {
    action: 'cancel',
    selectedPaths: [],
  })

  assert.deepEqual(syncPlan, {
    action: 'cancel',
    operations: [],
  })
})
