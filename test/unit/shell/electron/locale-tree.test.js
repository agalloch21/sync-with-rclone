import assert from 'node:assert/strict'
import test from 'node:test'
import { defineLocaleTree } from '#shell/locales/locale-tree.js'

test('defineLocaleTree expands dotted codes and preserves nested locale values', () => {
  assert.deepEqual(defineLocaleTree({
    'server.name.invalid': {
      title: 'Invalid Server Name',
      message: 'Specify a valid server name.',
    },
    'server.delete.confirmation': 'Delete?',
  }), {
    server: {
      name: {
        invalid: {
          title: 'Invalid Server Name',
          message: 'Specify a valid server name.',
        },
      },
      delete: {
        confirmation: 'Delete?',
      },
    },
  })
})

test('defineLocaleTree rejects invalid, unsafe, and conflicting paths', () => {
  assert.throws(() => defineLocaleTree({ 'server..invalid': 'Invalid' }), /empty segment/)
  assert.throws(() => defineLocaleTree({ 'server.__proto__.invalid': 'Invalid' }), /unsafe segment/)
  assert.throws(() => defineLocaleTree({
    'server': 'Server',
    'server.invalid': 'Invalid',
  }), /extends an existing value/)
  assert.throws(() => defineLocaleTree({
    'server.invalid': 'Invalid',
    'server': 'Server',
  }), /conflicts with another path/)
})

test('defineLocaleTree returns independent trees and nested values', () => {
  const entries = {
    'server.name.invalid': {
      title: 'Invalid',
    },
  }
  const first = defineLocaleTree(entries)
  const second = defineLocaleTree(entries)

  first.server.name.invalid.title = 'Changed'
  assert.equal(second.server.name.invalid.title, 'Invalid')
  assert.equal(entries['server.name.invalid'].title, 'Invalid')
})
