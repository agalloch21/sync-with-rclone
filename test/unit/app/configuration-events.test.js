import assert from 'node:assert/strict'
import test from 'node:test'
import {
  registerConfigUpdateListener,
  unregisterConfigUpdateListener,
  updateGlobalExclusionPatterns,
} from '#src/app/app-api.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('configuration commands publish updates through configuration events', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: [],
      mappings: [],
    },
  }, async () => {
    const updates = []
    const listener = () => updates.push('updated')
    registerConfigUpdateListener(listener)

    try {
      await updateGlobalExclusionPatterns(['.DS_Store'])
    }
    finally {
      unregisterConfigUpdateListener(listener)
    }

    assert.deepEqual(updates, ['updated'])
  })
})
