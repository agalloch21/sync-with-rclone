import assert from 'node:assert/strict'
import test from 'node:test'
import {
  registerConfigUpdateListener,
  unregisterConfigUpdateListener,
  updateGlobalIgnorePatterns,
} from '#src/app/app-api.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('configuration commands publish updates through configuration events', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: [],
      syncTasks: [],
    },
  }, async () => {
    const updates = []
    const listener = () => updates.push('updated')
    registerConfigUpdateListener(listener)

    try {
      await updateGlobalIgnorePatterns(['.DS_Store'])
    }
    finally {
      unregisterConfigUpdateListener(listener)
    }

    assert.deepEqual(updates, ['updated'])
  })
})
