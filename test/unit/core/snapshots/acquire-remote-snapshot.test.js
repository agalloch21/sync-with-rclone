import assert from 'node:assert/strict'
import test from 'node:test'
import { createExclusions } from '#src/core/exclusions.js'
import { buildRemoteSnapshot } from '#src/core/snapshots/acquire-snapshots.js'
import { withFakeRcloneCommand } from '#test/helpers/fake-rclone-command.js'

const REMOTE_NAME = 'fake-remote'
const NO_EXCLUSIONS = createExclusions()
const REMOTE_ENTRIES = [{
  Path: 'node_modules/module-a/module-a-index',
  Size: 1,
  ModTime: '2026-08-17T00:00:00Z',
  IsDir: false,
}, {
  Path: '.gitignore',
  Size: 12,
  ModTime: '2026-08-17T00:00:00Z',
  IsDir: false,
}]

test('buildRemoteSnapshot emits files only from recursive rclone listing', async () => {
  await withFakeRcloneCommand({
    lsjson: { stdout: JSON.stringify(REMOTE_ENTRIES) },
  }, async ({ runtimePaths }) => {
    const rootPath = `${REMOTE_NAME}:basic`
    const snapshot = await buildRemoteSnapshot(rootPath, NO_EXCLUSIONS, runtimePaths)
    const paths = snapshot.files.map(file => file.path)

    assert.ok(paths.includes('node_modules/module-a/module-a-index'))
    assert.ok(paths.includes('.gitignore'))
    assert.equal(paths.includes('node_modules'), false)
    assert.equal(paths.includes('node_modules/module-a'), false)
    assert.equal('dirEntries' in snapshot, false)
    assert.equal('fileEntries' in snapshot, false)
  })
})

test('buildRemoteSnapshot applies exclusions to the rclone listing', async () => {
  await withFakeRcloneCommand({
    lsjson: { stdout: JSON.stringify(REMOTE_ENTRIES) },
  }, async ({ runtimePaths }) => {
    const rootPath = `${REMOTE_NAME}:basic`
    const snapshot = await buildRemoteSnapshot(rootPath, createExclusions(['node_modules/']), runtimePaths)
    const paths = snapshot.files.map(file => file.path)

    assert.equal(paths.some(filePath => filePath.startsWith('node_modules/')), false)
    assert.ok(paths.includes('.gitignore'))
  })
})
