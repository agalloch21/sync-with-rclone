import assert from 'node:assert/strict'
import test from 'node:test'
import {
  registerConfigUpdateListener,
  unregisterConfigUpdateListener,
  updateGlobalFilterPatterns,
} from '#src/app/app-api.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('configuration commands publish updates through configuration events', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalFilterPatterns: [],
      mappings: [],
    },
  }, async () => {
    const updates = []
    const listener = () => updates.push('updated')
    registerConfigUpdateListener(listener)

    try {
      await updateGlobalFilterPatterns(['.DS_Store'])
    }
    finally {
      unregisterConfigUpdateListener(listener)
    }

    assert.deepEqual(updates, ['updated'])
  })
})
