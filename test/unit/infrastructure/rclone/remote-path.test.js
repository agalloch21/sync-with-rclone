import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isRemoteFolderPathWithin,
  normalizeRemoteFolderPath,
  remoteFolderPathsOverlap,
} from '#src/infrastructure/rclone/remote-path.js'

test('normalizeRemoteFolderPath resolves dot segments without changing remote identity', () => {
  assert.equal(
    normalizeRemoteFolderPath('nas:safe/root/../../outside/./child/'),
    'nas:outside/child',
  )
  assert.equal(normalizeRemoteFolderPath('nas:'), 'nas:')
  assert.equal(normalizeRemoteFolderPath('nas:/'), 'nas:/')
  assert.equal(normalizeRemoteFolderPath('nas:/volume/../shared'), 'nas:/shared')
})

test('normalizeRemoteFolderPath rejects paths that escape the remote root', () => {
  assert.throws(
    () => normalizeRemoteFolderPath('nas:../../outside'),
    /Remote folder path escapes its root/,
  )
})

test('isRemoteFolderPathWithin handles root mappings and rejects traversal escapes', () => {
  assert.equal(isRemoteFolderPathWithin('nas:folder', 'nas:'), true)
  assert.equal(isRemoteFolderPathWithin('nas:/folder', 'nas:/'), true)
  assert.equal(isRemoteFolderPathWithin('nas:safe/root/child', 'nas:safe/root'), true)
  assert.equal(isRemoteFolderPathWithin('nas:safe/root/../../outside', 'nas:safe/root'), false)
  assert.equal(isRemoteFolderPathWithin('nas:/safe/root', 'nas:safe/root'), false)
})

test('remoteFolderPathsOverlap compares normalized folder identities', () => {
  assert.equal(remoteFolderPathsOverlap('nas:safe/root/../../outside', 'nas:outside/child'), true)
  assert.equal(remoteFolderPathsOverlap('nas:/', 'nas:/outside'), true)
  assert.equal(remoteFolderPathsOverlap('nas:/outside', 'nas:outside'), false)
  assert.equal(remoteFolderPathsOverlap('nas:folder', 'backup:folder'), false)
})

test('normalizeRemoteFolderPath rejects a missing remote name', () => {
  assert.throws(() => normalizeRemoteFolderPath('folder/only'), /Invalid rclone remote path/)
})
