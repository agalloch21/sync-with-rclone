import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSyncPlan } from '#src/core/planning/build-sync-plan.js'
import { DiffState } from '#src/core/snapshots/snapshot.js'

test('buildSyncPlan emits file operations for selected file-level differences', () => {
  const diffSnapshot = {
    srcRoot: '/src-root',
    dstRoot: '/dst-root',
    summary: { modified: 1, added: 1, deleted: 1 },
    files: [
      { path: 'added/added.txt', size: 1, mtimeMs: 1, state: DiffState.added },
      { path: 'modified/modified.txt', size: 1, mtimeMs: 1, state: DiffState.modified },
      { path: 'deleted/deleted.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
    ],
  }

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

test('buildSyncPlan never emits directory operations', () => {
  const diffSnapshot = {
    srcRoot: '/src-root',
    dstRoot: '/dst-root',
    summary: { modified: 0, added: 1, deleted: 1 },
    files: [
      { path: 'added-dir/new.txt', size: 1, mtimeMs: 1, state: DiffState.added },
      { path: 'deleted-dir/old.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
    ],
  }

  const syncPlan = buildSyncPlan(diffSnapshot, {
    action: 'confirm',
    selectedPaths: ['added-dir', 'deleted-dir'],
  })

  assert.deepEqual(syncPlan, {
    action: 'confirm',
    operations: [
      { type: 'copy', path: 'added-dir/new.txt' },
      { type: 'delete', path: 'deleted-dir/old.txt' },
    ],
  })
})

test('buildSyncPlan orders structural conflict deletes before copies', () => {
  const syncPlan = buildSyncPlan({
    srcRoot: '/src-root',
    dstRoot: '/dst-root',
    summary: { modified: 0, added: 2, deleted: 3 },
    files: [
      { path: 'file-to-directory', size: 1, mtimeMs: 1, state: DiffState.deleted },
      { path: 'file-to-directory/new.txt', size: 1, mtimeMs: 1, state: DiffState.added },
      { path: 'directory-to-file', size: 1, mtimeMs: 1, state: DiffState.added },
      { path: 'directory-to-file/old.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
      { path: 'ordinary-delete.txt', size: 1, mtimeMs: 1, state: DiffState.deleted },
    ],
  }, {
    action: 'confirm',
    selectedPaths: ['.'],
  })

  assert.deepEqual(syncPlan.operations, [
    { type: 'delete', path: 'directory-to-file/old.txt' },
    { type: 'delete', path: 'file-to-directory' },
    { type: 'copy', path: 'directory-to-file' },
    { type: 'copy', path: 'file-to-directory/new.txt' },
    { type: 'delete', path: 'ordinary-delete.txt' },
  ])
})

test('buildSyncPlan rejects a selected copy whose structural conflict deletion was not selected', () => {
  assert.throws(() => buildSyncPlan({
    srcRoot: '/src-root',
    dstRoot: '/dst-root',
    summary: { modified: 0, added: 1, deleted: 1 },
    files: [
      { path: 'blocked', size: 1, mtimeMs: 1, state: DiffState.deleted },
      { path: 'blocked/new.txt', size: 1, mtimeMs: 1, state: DiffState.added },
    ],
  }, {
    action: 'confirm',
    selectedPaths: ['blocked/new.txt'],
  }), /require selecting the structural conflict deletion: blocked/)
})

test('buildSyncPlan returns an empty plan when review is cancelled', () => {
  const syncPlan = buildSyncPlan({
    srcRoot: '/src-root',
    dstRoot: '/dst-root',
    summary: { modified: 0, added: 0, deleted: 0 },
    files: [],
  }, {
    action: 'cancel',
    selectedPaths: [],
  })

  assert.deepEqual(syncPlan, {
    action: 'cancel',
    operations: [],
  })
})
