import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { resolveSyncTask } from '#src/app/operations/sync/resolve-task.js'

const projectRoot = path.resolve('test/fixtures/local').replaceAll(path.sep, path.posix.sep)

function createConfig(taskOverrides = {}) {
  return {
    globalIgnorePatterns: ['.DS_Store'],
    syncTasks: [
      {
        displayName: 'ProjectsSynced',
        rcloneRemote: 'synology',
        localBasePath: projectRoot,
        remoteBasePath: 'ProjectsSynced',
        ignorePatterns: ['node_modules/'],
        ...taskOverrides,
      },
    ],
  }
}

test('resolveSyncTask matches the correct sync task and computes the default remote path', () => {
  const config = createConfig()
  const result = resolveSyncTask(config, 'test/fixtures/local/compare-push')

  assert.equal(result.matchedTask.displayName, 'ProjectsSynced')
  assert.equal(result.localFolderPath, path.resolve('test/fixtures/local/compare-push').replaceAll(path.sep, path.posix.sep))
  assert.equal(result.relativePath, 'compare-push')
  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/compare-push')
  assert.deepEqual(result.extraIgnorePatterns, ['.DS_Store', 'node_modules/'])
})

test('resolveSyncTask allows explicit remote paths inside the same sync task', () => {
  const config = createConfig()
  const result = resolveSyncTask(
    config,
    'test/fixtures/local/compare-push',
    'synology:ProjectsSynced/custom-target',
  )

  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/custom-target')
})

test('resolveSyncTask rejects explicit remote paths outside the current sync task', () => {
  const config = createConfig()

  assert.throws(() => resolveSyncTask(
    config,
    'test/fixtures/local/compare-push',
    'synology:AnotherRoot/custom-target',
  ), {
    name: 'AppError',
    code: APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK,
  })
})

test('resolveSyncTask throws when no sync task matches the local path', () => {
  const config = createConfig()

  assert.throws(() => resolveSyncTask(config, 'test/fixtures/scan/nested'), {
    name: 'AppError',
    code: APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK,
  })
})

test('resolveSyncTask allows syncing to the remote root when remoteBasePath is empty', () => {
  const config = {
    globalIgnorePatterns: [],
    syncTasks: [
      {
        displayName: 'ProjectsSynced',
        rcloneRemote: 'synology',
        localBasePath: path.resolve('test/fixtures/local/compare-push').replaceAll(path.sep, path.posix.sep),
        remoteBasePath: '',
        ignorePatterns: [],
      },
    ],
  }

  const result = resolveSyncTask(config, 'test/fixtures/local/compare-push')

  assert.equal(result.relativePath, '.')
  assert.equal(result.remoteFolderPath, 'synology:')
})

test('resolveSyncTask allows an explicit descendant of the remote root', () => {
  const config = createConfig({ remoteBasePath: '' })
  const result = resolveSyncTask(config, projectRoot, 'synology:subfolder')

  assert.equal(result.remoteFolderPath, 'synology:subfolder')
})

test('resolveSyncTask rejects normalized traversal outside the remote root', () => {
  const config = createConfig({ remoteBasePath: 'Projects/App' })

  assert.throws(
    () => resolveSyncTask(config, projectRoot, 'synology:Projects/App/../../outside'),
    error => error.code === APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK,
  )
})

test('resolveSyncTask uses a selected link logical path for mapping and its real path for execution', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'resolve-sync-task-link-'))
  const projectPath = path.join(temporaryPath, 'project')
  const externalAssetsPath = path.join(temporaryPath, 'external-assets')
  const linkedAssetsPath = path.join(projectPath, 'assets')

  try {
    await fs.mkdir(projectPath)
    await fs.mkdir(externalAssetsPath)
    try {
      await fs.symlink(externalAssetsPath, linkedAssetsPath, 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    const result = resolveSyncTask(createConfig({
      localBasePath: projectPath,
      remoteBasePath: 'Projects',
    }), linkedAssetsPath)

    assert.equal(result.relativePath, 'assets')
    assert.equal(result.localFolderPath, await fs.realpath(externalAssetsPath))
    assert.equal(result.remoteFolderPath, 'synology:Projects/assets')
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})
