import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * 这个测试不做运行时类型检查。
 * 目标只是固定住 Snapshot 在项目里的“数据长相”，让后续模块按同一结构组织数据。
 *
 * @type {import('#src/core/snapshot.js').Snapshot}
 */
const snapshotSample = {
  root: '/demo/root',
  entriesByPath: new Map([
    ['docs', { path: 'docs' }],
    ['docs/readme.md', { path: 'docs/readme.md', mtime: new Date('2026-03-23T00:00:00.000Z'), size: 12 }],
  ]),
  childrenByPath: new Map([
    ['.', ['docs']],
    ['docs', ['readme.md']],
  ]),
}

test('Snapshot sample uses the expected shared structure', () => {
  assert.equal(snapshotSample.root, '/demo/root')
  assert.ok(snapshotSample.entriesByPath instanceof Map)
  assert.ok(snapshotSample.childrenByPath instanceof Map)

  const dirEntry = snapshotSample.entriesByPath.get('docs')
  const fileEntry = snapshotSample.entriesByPath.get('docs/readme.md')

  assert.deepEqual(dirEntry, { path: 'docs' })
  assert.equal(fileEntry?.path, 'docs/readme.md')
  assert.equal(fileEntry?.size, 12)
  assert.ok(fileEntry?.mtime instanceof Date)
  assert.deepEqual(snapshotSample.childrenByPath.get('docs'), ['readme.md'])
})
