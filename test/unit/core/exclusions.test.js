import assert from 'node:assert/strict'
import test from 'node:test'
import { createExclusions, normalizeExclusionPatterns } from '#src/core/exclusions.js'

test('normalizeExclusionPatterns trims validated patterns', () => {
  assert.deepEqual(
    normalizeExclusionPatterns(['  .DS_Store ', ' node_modules/  ']),
    ['.DS_Store', 'node_modules/'],
  )
})

test('exclusions exclude files and entire directory trees without negation', () => {
  const exclusions = createExclusions(['.DS_Store', '*.tmp', '.git', 'node_modules/'])

  assert.equal(exclusions.excludes('.DS_Store'), true)
  assert.equal(exclusions.excludes('nested/.DS_Store'), true)
  assert.equal(exclusions.excludes('cache.tmp'), true)
  assert.equal(exclusions.excludes('cache.tmp/file.txt'), true)
  assert.equal(exclusions.excludes('.git', true), true)
  assert.equal(exclusions.excludes('.git/config'), true)
  assert.equal(exclusions.excludes('packages/app/node_modules', true), true)
  assert.equal(exclusions.excludes('packages/app/node_modules/pkg/index.js'), true)
  assert.equal(exclusions.excludes('src/index.js'), false)
})

test('exclusions compile directory-capable rclone excludes', () => {
  const exclusions = createExclusions(['.DS_Store', '.git', 'node_modules/'])

  assert.deepEqual(exclusions.rcloneExcludePatterns, [
    '.DS_Store',
    '.DS_Store/**',
    '.git',
    '.git/**',
    'node_modules/**',
  ])
})

test('exclusions reject negation, comments, and empty patterns', () => {
  assert.throws(() => createExclusions(['!keep.txt']), /do not support negation/)
  assert.throws(() => createExclusions(['# comment']), /do not support comments/)
  assert.throws(() => createExclusions(['  ']), /must not be empty/)
})
