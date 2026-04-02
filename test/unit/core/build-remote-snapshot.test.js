import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRemoteSnapshot } from '#src/core/build-remote-snapshot.js'

const REMOTE_NAME = 'fake-remote'

test('Test buildRemoteSnapshot', async () => {
  const rootPath = `${REMOTE_NAME}:` + `basic`
  const snapshot = await buildRemoteSnapshot(rootPath)
  assert.ok(snapshot.fileEntries.has('node_modules/module-a/module-a-index'))
  assert.ok(snapshot.fileEntries.has('.gitignore'))
  assert.ok(snapshot.dirEntries.has('node_modules'))
  assert.ok(snapshot.dirEntries.has('node_modules/module-a'))
  assert.ok(snapshot.dirEntries.get('node_modules/module-a').children.has('module-a-index'))
  assert.ok(snapshot.dirEntries.get('.').children.get('node_modules').isDir === true)
  assert.ok(snapshot.dirEntries.get('.').children.get('.gitignore').isDir === false)
})
