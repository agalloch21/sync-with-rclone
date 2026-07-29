import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * This test does not perform runtime type checking.
 * It pins the shared serializable Snapshot data shape.
 *
 * @type {import('#src/domain/synchronization/snapshot.js').Snapshot}
 */
const snapshotSample = {
  root: '/demo/root',
  files: [
    { path: 'docs/readme.md', mtimeMs: Date.parse('2026-03-23T00:00:00.000Z'), size: 12 },
  ],
}

test('Snapshot sample uses the expected file-only shared structure', () => {
  assert.equal(snapshotSample.root, '/demo/root')
  assert.ok(Array.isArray(snapshotSample.files))
  assert.deepEqual(snapshotSample.files[0], {
    path: 'docs/readme.md',
    mtimeMs: Date.parse('2026-03-23T00:00:00.000Z'),
    size: 12,
  })
  assert.doesNotThrow(() => JSON.stringify(snapshotSample))
})
