import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { listGlobalExclusionPatterns, updateGlobalExclusionPatterns } from '#src/app/operations/settings.js'
import { updateConfiguration } from '#src/app/services/app-config.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('listGlobalExclusionPatterns reads global patterns through settings operations', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: ['.DS_Store', 'Thumbs.db'],
      mappings: [],
    },
  }, async () => {
    assert.deepEqual(await listGlobalExclusionPatterns(), ['.DS_Store', 'Thumbs.db'])
  })
})

test('updateGlobalExclusionPatterns changes global patterns and preserves mappings', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: ['old'],
      mappings: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/project',
        remoteBasePath: 'Project',
        exclusionPatterns: ['mapping-only'],
      }],
    },
  }, async ({ configPath }) => {
    const result = await updateGlobalExclusionPatterns([' .DS_Store ', '*.tmp', '*.tmp'])

    assert.deepEqual(result, ['.DS_Store', '*.tmp', '*.tmp'])
    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalExclusionPatterns, ['.DS_Store', '*.tmp', '*.tmp'])
    assert.equal(saved.mappings[0].displayName, 'Project')
    assert.deepEqual(saved.mappings[0].exclusionPatterns, ['mapping-only'])
    assert.deepEqual(await fs.readdir(path.dirname(configPath)), ['config.json'])
  })
})

test('configuration updates serialize concurrent read-modify-write sections', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: [],
      mappings: [],
    },
  }, async () => {
    const appendPattern = pattern => updateConfiguration(async (config) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return {
        ...config,
        globalExclusionPatterns: [...config.globalExclusionPatterns, pattern],
      }
    })

    await Promise.all([appendPattern('first'), appendPattern('second')])

    assert.deepEqual(
      [...await listGlobalExclusionPatterns()].sort(),
      ['first', 'second'],
    )
  })
})

test('updateGlobalExclusionPatterns rejects non-string entries', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: [],
      mappings: [],
    },
  }, async () => {
    await assert.rejects(
      () => updateGlobalExclusionPatterns(['valid', null]),
      error => error?.code === 'ipc.invalid_payload',
    )
  })
})

test('updateGlobalExclusionPatterns rejects negation rules', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: [],
      mappings: [],
    },
  }, async () => {
    await assert.rejects(
      () => updateGlobalExclusionPatterns(['!keep.txt']),
      error => error?.code === 'ipc.invalid_payload' && /negation/.test(error.message),
    )
  })
})
