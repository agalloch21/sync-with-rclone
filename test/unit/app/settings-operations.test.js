import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { listGlobalFilterPatterns, updateGlobalFilterPatterns } from '#src/app/operations/settings.js'
import { updateConfiguration } from '#src/app/services/app-config.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('listGlobalFilterPatterns reads global patterns through settings operations', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalFilterPatterns: ['.DS_Store', 'Thumbs.db'],
      mappings: [],
    },
  }, async () => {
    assert.deepEqual(await listGlobalFilterPatterns(), ['.DS_Store', 'Thumbs.db'])
  })
})

test('updateGlobalFilterPatterns changes global patterns and preserves mappings', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalFilterPatterns: ['old'],
      mappings: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/project',
        remoteBasePath: 'Project',
        filterPatterns: ['mapping-only'],
      }],
    },
  }, async ({ configPath }) => {
    const result = await updateGlobalFilterPatterns(['.DS_Store', '*.tmp', '*.tmp'])

    assert.deepEqual(result, ['.DS_Store', '*.tmp', '*.tmp'])
    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalFilterPatterns, ['.DS_Store', '*.tmp', '*.tmp'])
    assert.equal(saved.mappings[0].displayName, 'Project')
    assert.deepEqual(saved.mappings[0].filterPatterns, ['mapping-only'])
    assert.deepEqual(await fs.readdir(path.dirname(configPath)), ['config.json'])
  })
})

test('configuration updates serialize concurrent read-modify-write sections', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalFilterPatterns: [],
      mappings: [],
    },
  }, async () => {
    const appendPattern = pattern => updateConfiguration(async (config) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return {
        ...config,
        globalFilterPatterns: [...config.globalFilterPatterns, pattern],
      }
    })

    await Promise.all([appendPattern('first'), appendPattern('second')])

    assert.deepEqual(
      [...await listGlobalFilterPatterns()].sort(),
      ['first', 'second'],
    )
  })
})

test('updateGlobalFilterPatterns rejects non-string entries', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalFilterPatterns: [],
      mappings: [],
    },
  }, async () => {
    await assert.rejects(
      () => updateGlobalFilterPatterns(['valid', null]),
      error => error?.code === 'ipc.invalid_payload',
    )
  })
})

test('updateGlobalFilterPatterns rejects negation rules', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalFilterPatterns: [],
      mappings: [],
    },
  }, async () => {
    await assert.rejects(
      () => updateGlobalFilterPatterns(['!keep.txt']),
      error => error?.code === 'ipc.invalid_payload' && /negation/.test(error.message),
    )
  })
})
