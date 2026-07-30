import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSnapshot } from '#src/domain/synchronization/build-snapshot.js'

test('buildSnapshot creates a sorted serializable snapshot from neutral file entries', () => {
  const snapshot = buildSnapshot('root', [
    { path: 'z.txt', size: 2, mtimeMs: 20 },
    { path: 'a.txt', size: 1, mtimeMs: 10 },
  ])

  assert.deepEqual(snapshot, {
    root: 'root',
    files: [
      { path: 'a.txt', size: 1, mtimeMs: 10 },
      { path: 'z.txt', size: 2, mtimeMs: 20 },
    ],
  })
  assert.doesNotThrow(() => JSON.stringify(snapshot))
})
