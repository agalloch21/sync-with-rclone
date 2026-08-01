import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  SYNC_TASK_DELETE_PROGRESS_STEP,
  SYNC_TASK_RETARGET_PROGRESS_STEP,
  SYNC_TASK_SAVE_PROGRESS_STEP,
} from '#src/app/contracts/task.js'
import {
  createSyncTask,
  deleteTaskFromConfig,
  retargetSyncTasks,
  updateSyncTask,
  updateSyncTaskIgnorePatterns,
} from '#src/app/operations/task.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('deleteTaskFromConfig removes the selected task and preserves global ignore patterns', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: ['.DS_Store'],
      syncTasks: [
        {
          displayName: 'A',
          rcloneRemote: 'synology',
          localBasePath: '/local/a',
          remoteBasePath: 'A',
          ignorePatterns: [],
        },
        {
          displayName: 'B',
          rcloneRemote: 'synology',
          localBasePath: '/local/b',
          remoteBasePath: 'B',
          ignorePatterns: ['node_modules/'],
        },
      ],
    },
  }, async ({ configPath }) => {
    const progress = []
    const deletedTask = await deleteTaskFromConfig({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/a'),
    }, step => progress.push(step))

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.equal(deletedTask.displayName, 'A')
    assert.equal(deletedTask.localBasePath, path.resolve('/local/a'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
    assert.deepEqual(saved.syncTasks.map(task => task.displayName), ['B'])
    assert.deepEqual(saved.syncTasks[0].ignorePatterns, ['node_modules/'])
    assert.deepEqual(progress, [SYNC_TASK_DELETE_PROGRESS_STEP.DELETE])
  })
})

test('deleteTaskFromConfig returns an error when the task does not exist', async () => {
  await withFakeAppRuntime({
    appConfig: {
      syncTasks: [{
        displayName: 'A',
        rcloneRemote: 'synology',
        localBasePath: '/local/a',
        remoteBasePath: 'A',
        ignorePatterns: [],
      }],
    },
  }, async () => {
    await assert.rejects(
      () => deleteTaskFromConfig({
        rcloneRemote: 'synology',
        localBasePath: path.resolve('/local/missing'),
      }),
      error => error?.code === 'sync_task.not_found',
    )
  })
})

test('createSyncTask saves a normalized mapping with default metadata', async () => {
  await withFakeAppRuntime({
    appConfig: { globalIgnorePatterns: ['.DS_Store'], syncTasks: [] },
  }, async ({ tempDir, configPath }) => {
    const localPath = path.join(tempDir, 'local')
    await fs.mkdir(localPath)

    const progress = []
    const result = await createSyncTask({
      rcloneRemote: ' synology ',
      localBasePath: localPath,
      remoteBasePath: 'Projects\\Current/',
    }, step => progress.push(step))

    assert.equal(result.rcloneRemote, 'synology')
    assert.equal(result.remoteBasePath, 'Projects/Current')
    assert.deepEqual(result.ignorePatterns, [])
    assert.equal(result.lastSyncDate, null)

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
    assert.equal(saved.syncTasks[0].localBasePath, localPath)
    assert.deepEqual(progress, [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE])
  })
})

test('updateSyncTask changes the mapping and preserves task metadata', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: [],
      syncTasks: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        ignorePatterns: ['node_modules/'],
        lastSyncMode: 'push',
        lastSyncFolder: 'src',
        lastSyncDate: '2026-07-17',
      }],
    },
  }, async ({ tempDir }) => {
    const nextPath = path.join(tempDir, 'next')
    await fs.mkdir(nextPath)

    const result = await updateSyncTask({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/current'),
    }, {
      rcloneRemote: 'synology',
      localBasePath: nextPath,
      remoteBasePath: 'Next',
    })

    assert.equal(result.displayName, 'Project')
    assert.deepEqual(result.ignorePatterns, ['node_modules/'])
    assert.equal(result.lastSyncMode, 'push')
    assert.equal(result.localBasePath, nextPath)
    assert.equal(result.remoteBasePath, 'Next')
  })
})

test('updateSyncTaskIgnorePatterns changes patterns and preserves global patterns and task metadata', async () => {
  const localPath = process.cwd()
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: ['.DS_Store'],
      syncTasks: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: localPath,
        remoteBasePath: 'Current',
        ignorePatterns: ['old-pattern'],
        lastSyncMode: 'pull',
        lastSyncFolder: 'src',
        lastSyncDate: '2026-07-20',
      }],
    },
  }, async ({ configPath }) => {
    const result = await updateSyncTaskIgnorePatterns({
      rcloneRemote: 'synology',
      localBasePath: localPath,
    }, ['node_modules/', '*.tmp', '*.tmp'])

    assert.deepEqual(result.ignorePatterns, ['node_modules/', '*.tmp', '*.tmp'])
    assert.equal(result.displayName, 'Project')
    assert.equal(result.lastSyncMode, 'pull')

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
    assert.deepEqual(saved.syncTasks[0].ignorePatterns, ['node_modules/', '*.tmp', '*.tmp'])
    assert.equal(saved.syncTasks[0].lastSyncFolder, 'src')
    assert.equal(saved.syncTasks[0].lastSyncDate, '2026-07-20')
  })
})

test('updateSyncTaskIgnorePatterns rejects non-string entries', async () => {
  await withFakeAppRuntime({
    appConfig: {
      syncTasks: [{
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        ignorePatterns: [],
      }],
    },
  }, async () => {
    await assert.rejects(() => updateSyncTaskIgnorePatterns({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/current'),
    }, ['valid', 42]), error => error?.code === 'ipc.invalid_payload')
  })
})

test('updateSyncTask rejects a conflicting server and local folder pair', async () => {
  const localA = process.cwd()
  const localB = path.dirname(localA)
  await withFakeAppRuntime({
    appConfig: {
      syncTasks: [
        { rcloneRemote: 'synology', localBasePath: localA, remoteBasePath: 'A' },
        { rcloneRemote: 'synology', localBasePath: localB, remoteBasePath: 'B' },
      ],
    },
  }, async () => {
    await assert.rejects(() => updateSyncTask({
      rcloneRemote: 'synology',
      localBasePath: localA,
    }, {
      rcloneRemote: 'synology',
      localBasePath: localB,
      remoteBasePath: 'Other',
    }), error => error?.code === 'sync_task.already_exists')
  })
})

test('retargetSyncTasks updates every task for the renamed server and preserves task metadata', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalIgnorePatterns: ['.DS_Store'],
      syncTasks: [
        {
          displayName: 'A',
          rcloneRemote: 'synology',
          localBasePath: '/local/a',
          remoteBasePath: 'A',
          ignorePatterns: ['node_modules/'],
          lastSyncMode: 'push',
          lastSyncFolder: 'src',
          lastSyncDate: '2026-07-19',
        },
        {
          displayName: 'B',
          rcloneRemote: 'synology',
          localBasePath: '/local/b',
          remoteBasePath: 'B',
          ignorePatterns: [],
        },
        {
          displayName: 'Other',
          rcloneRemote: 'backup',
          localBasePath: '/local/other',
          remoteBasePath: 'Other',
          ignorePatterns: [],
        },
      ],
    },
  }, async ({ configPath }) => {
    const progress = []
    await retargetSyncTasks(' synology ', ' nas ', step => progress.push(step))

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalIgnorePatterns, ['.DS_Store'])
    assert.deepEqual(saved.syncTasks.map(task => task.rcloneRemote), ['nas', 'nas', 'backup'])
    assert.deepEqual(saved.syncTasks[0], {
      displayName: 'A',
      rcloneRemote: 'nas',
      localBasePath: path.resolve('/local/a'),
      remoteBasePath: 'A',
      ignorePatterns: ['node_modules/'],
      lastSyncMode: 'push',
      lastSyncFolder: 'src',
      lastSyncDate: '2026-07-19',
    })
    assert.deepEqual(progress, [SYNC_TASK_RETARGET_PROGRESS_STEP.RETARGET])
  })
})
