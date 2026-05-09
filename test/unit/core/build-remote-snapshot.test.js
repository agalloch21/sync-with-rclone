import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRemoteSnapshot } from '#src/core/build-remote-snapshot.js'

const REMOTE_NAME = 'fake-remote'

test('buildRemoteSnapshot emits files only from recursive rclone listing', async () => {
  const rootPath = `${REMOTE_NAME}:basic`
  const snapshot = await buildRemoteSnapshot(rootPath)
  const paths = snapshot.files.map(file => file.path)

  assert.ok(paths.includes('node_modules/module-a/module-a-index'))
  assert.ok(paths.includes('.gitignore'))
  assert.equal(paths.includes('node_modules'), false)
  assert.equal(paths.includes('node_modules/module-a'), false)
  assert.equal('dirEntries' in snapshot, false)
  assert.equal('fileEntries' in snapshot, false)
})
