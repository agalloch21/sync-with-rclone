import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSyncPlan } from '#src/core/build-sync-plan.js'
import { DiffState } from '#src/core/snapshot.js'

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
