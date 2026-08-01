import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { listGlobalIgnorePatterns, updateGlobalIgnorePatterns } from '#src/app/operations/settings.js'
import { updateConfiguration } from '#src/app/services/app-config.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('listGlobalIgnorePatterns reads global patterns through settings operations', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
      syncTasks: [],
    },
  }, async () => {
    assert.deepEqual(await listGlobalIgnorePatterns(), ['.DS_Store', 'Thumbs.db'])
  })
})

test('updateGlobalIgnorePatterns changes global patterns and preserves sync tasks', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: ['old'],
      syncTasks: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/project',
        remoteBasePath: 'Project',
        ignorePatterns: ['task-only'],
      }],
    },
  }, async ({ configPath }) => {
    const result = await updateGlobalIgnorePatterns(['.DS_Store', '*.tmp', '*.tmp'])

    assert.deepEqual(result, ['.DS_Store', '*.tmp', '*.tmp'])
    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store', '*.tmp', '*.tmp'])
    assert.equal(saved.syncTasks[0].displayName, 'Project')
    assert.deepEqual(saved.syncTasks[0].ignorePatterns, ['task-only'])
    assert.deepEqual(await fs.readdir(path.dirname(configPath)), ['config.json'])
  })
})

test('configuration updates serialize concurrent read-modify-write sections', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: [],
      syncTasks: [],
    },
  }, async () => {
    const appendPattern = pattern => updateConfiguration(async (config) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return {
        ...config,
        globalIgnorePatterns: [...config.globalIgnorePatterns, pattern],
      }
    })

    await Promise.all([appendPattern('first'), appendPattern('second')])

    assert.deepEqual(
      [...await listGlobalIgnorePatterns()].sort(),
      ['first', 'second'],
    )
  })
})

test('updateGlobalIgnorePatterns rejects non-string entries', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: [],
      syncTasks: [],
    },
  }, async () => {
    await assert.rejects(
      () => updateGlobalIgnorePatterns(['valid', null]),
      error => error?.code === 'ipc.invalid_payload',
    )
  })
})
