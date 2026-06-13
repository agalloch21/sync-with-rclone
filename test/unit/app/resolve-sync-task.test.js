import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { resolveSyncTask } from '#src/app/sync-session/resolve-sync-task.js'

function createConfig() {
  return {
    globalIgnorePatterns: ['.DS_Store'],
    syncTasks: [
      {
        name: 'ProjectsSynced',
        rcloneRemote: 'synology',
        localBasePath: path.resolve('test/fixtures/local').replaceAll(path.sep, path.posix.sep),
        remoteBasePath: 'ProjectsSynced',
        ignorePatterns: ['node_modules/'],
      },
    ],
  }
}

test('resolveSyncTask matches the correct sync task and computes the default remote path', () => {
  const config = createConfig()
  const result = resolveSyncTask(config, 'test/fixtures/local/compare-push')

  assert.equal(result.matchedTask.name, 'ProjectsSynced')
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
        name: 'ProjectsSynced',
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
