import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidRendererSurface,
  RENDERER_SURFACE,
} from '#electron/contracts/renderer-surface.js'

test('renderer surface contract exposes every Electron renderer surface', () => {
  assert.deepEqual(Object.values(RENDERER_SURFACE), [
    'main-window',
    'message-box',
    'folder-dialog',
    'sync-session',
    'form-modal',
  ])

  for (const surface of Object.values(RENDERER_SURFACE))
    assert.equal(isValidRendererSurface(surface), true)

  assert.equal(isValidRendererSurface('unknown'), false)
})
