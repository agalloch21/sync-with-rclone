import assert from 'node:assert/strict'
import test from 'node:test'
import { createExclusions } from '#src/core/exclusions.js'
import { buildRemoteSnapshot } from '#src/core/snapshots/acquire-snapshots.js'

const REMOTE_NAME = 'fake-remote'
const NO_EXCLUSIONS = createExclusions()

test('buildRemoteSnapshot emits files only from recursive rclone listing', async () => {
  const rootPath = `${REMOTE_NAME}:basic`
  const snapshot = await buildRemoteSnapshot(rootPath, NO_EXCLUSIONS)
  const paths = snapshot.files.map(file => file.path)

  assert.ok(paths.includes('node_modules/module-a/module-a-index'))
  assert.ok(paths.includes('.gitignore'))
  assert.equal(paths.includes('node_modules'), false)
  assert.equal(paths.includes('node_modules/module-a'), false)
  assert.equal('dirEntries' in snapshot, false)
  assert.equal('fileEntries' in snapshot, false)
})

test('buildRemoteSnapshot applies exclusions to the rclone listing', async () => {
  const rootPath = `${REMOTE_NAME}:basic`
  const snapshot = await buildRemoteSnapshot(rootPath, createExclusions(['node_modules/']))
  const paths = snapshot.files.map(file => file.path)

  assert.equal(paths.some(filePath => filePath.startsWith('node_modules/')), false)
  assert.ok(paths.includes('.gitignore'))
})
