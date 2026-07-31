import assert from 'node:assert/strict'
import test from 'node:test'

import {
  localPathsOverlap,
  remotePathsOverlap,
  sessionDescriptorsOverlap,
} from '#electron/main/sync-session/manager.js'

test('path overlap checks exact and parent-child roots using path boundaries', () => {
  assert.equal(localPathsOverlap('/projects/a', '/projects/a'), true)
  assert.equal(localPathsOverlap('/projects/a', '/projects/a/child'), true)
  assert.equal(localPathsOverlap('/projects/a', '/projects/ab'), false)
  assert.equal(localPathsOverlap('/', '/projects/a'), true)
  assert.equal(localPathsOverlap('C:\\Projects\\A', 'c:/projects/a/child', 'win32'), true)

  assert.equal(remotePathsOverlap('nas:projects/a', 'nas:projects/a/child'), true)
  assert.equal(remotePathsOverlap('nas:projects/a', 'backup:projects/a'), false)
  assert.equal(remotePathsOverlap('nas:projects/a', 'nas:projects/ab'), false)
  assert.equal(remotePathsOverlap('nas:', 'nas:projects/a'), true)
})

test('session descriptors conflict when either local or remote roots overlap', () => {
  assert.equal(sessionDescriptorsOverlap({
    localFolderPath: '/local/a',
    remoteFolderPath: 'nas:remote/a',
  }, {
    localFolderPath: '/local/b',
    remoteFolderPath: 'nas:remote/a/child',
  }), true)

  assert.equal(sessionDescriptorsOverlap({
    localFolderPath: '/local/a',
    remoteFolderPath: 'nas:remote/a',
  }, {
    localFolderPath: '/local/b',
    remoteFolderPath: 'nas:remote/b',
  }), false)
})
