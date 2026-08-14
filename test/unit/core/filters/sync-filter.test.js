import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncFilter } from '#src/core/filters/sync-filter.js'

test('sync filters exclude files and entire directory trees without negation', () => {
  const filter = createSyncFilter(['.DS_Store', '*.tmp', '.git', 'node_modules/'])

  assert.equal(filter.ignores('.DS_Store'), true)
  assert.equal(filter.ignores('nested/.DS_Store'), true)
  assert.equal(filter.ignores('cache.tmp'), true)
  assert.equal(filter.ignores('cache.tmp/file.txt'), true)
  assert.equal(filter.ignores('.git', true), true)
  assert.equal(filter.ignores('.git/config'), true)
  assert.equal(filter.ignores('packages/app/node_modules', true), true)
  assert.equal(filter.ignores('packages/app/node_modules/pkg/index.js'), true)
  assert.equal(filter.ignores('src/index.js'), false)
})

test('sync filters compile directory-capable rclone excludes', () => {
  const filter = createSyncFilter(['.DS_Store', '.git', 'node_modules/'])

  assert.deepEqual(filter.rcloneExcludePatterns, [
    '.DS_Store',
    '.DS_Store/**',
    '.git',
    '.git/**',
    'node_modules/**',
  ])
})

test('sync filters reject negation, comments, and empty patterns', () => {
  assert.throws(() => createSyncFilter(['!keep.txt']), /do not support negation/)
  assert.throws(() => createSyncFilter(['# comment']), /do not support comments/)
  assert.throws(() => createSyncFilter(['  ']), /must not be empty/)
})
