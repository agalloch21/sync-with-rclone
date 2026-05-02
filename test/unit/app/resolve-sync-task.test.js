import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { resolveSyncTask } from '#src/app/resolve-sync-task.js'

function createConfig() {
  return {
    globalIgnorePatterns: ['.DS_Store'],
    syncJobs: [
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

test('resolveSyncTask matches the correct sync job and computes the default remote path', () => {
  const config = createConfig()
  const result = resolveSyncTask(config, 'test/fixtures/local/compare-push')

  assert.equal(result.matchedJob.name, 'ProjectsSynced')
  assert.equal(result.relativePath, 'compare-push')
  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/compare-push')
  assert.deepEqual(result.extraIgnorePatterns, ['.DS_Store', 'node_modules/'])
})

test('resolveSyncTask allows explicit remote paths inside the same sync job', () => {
  const config = createConfig()
  const result = resolveSyncTask(
    config,
    'test/fixtures/local/compare-push',
    'synology:ProjectsSynced/custom-target',
  )

  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/custom-target')
})

test('resolveSyncTask rejects explicit remote paths outside the current sync job', () => {
  const config = createConfig()

  assert.throws(() => resolveSyncTask(
    config,
    'test/fixtures/local/compare-push',
    'synology:AnotherRoot/custom-target',
  ))
})

test('resolveSyncTask throws when no sync job matches the local path', () => {
  const config = createConfig()

  assert.throws(() => resolveSyncTask(config, 'test/fixtures/scan/nested'))
})

test('resolveSyncTask allows syncing to the remote root when remoteBasePath is empty', () => {
  const config = {
    globalIgnorePatterns: [],
    syncJobs: [
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
