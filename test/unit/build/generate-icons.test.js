import assert from 'node:assert/strict'
import test from 'node:test'
import { getResizeToolForPlatform } from '../../../scripts/build/generate-icons.js'

test('generate-icons uses sips only on macOS', () => {
  assert.equal(getResizeToolForPlatform('darwin'), 'sips')
  assert.equal(getResizeToolForPlatform('win32'), 'powershell')
  assert.equal(getResizeToolForPlatform('linux'), null)
})
