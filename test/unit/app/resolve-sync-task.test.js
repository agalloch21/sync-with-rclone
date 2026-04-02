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
  const result = resolveSyncTask('test/fixtures/local/compare-push', config)

  assert.equal(result.syncJob.name, 'ProjectsSynced')
  assert.equal(result.relativePath, 'compare-push')
  assert.equal(result.defaultRemoteFolderPath, 'synology:ProjectsSynced/compare-push')
  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/compare-push')
  assert.deepEqual(result.extraIgnorePatterns, ['.DS_Store', 'node_modules/'])
})

test('resolveSyncTask allows explicit remote paths inside the same sync job', () => {
  const config = createConfig()
  const result = resolveSyncTask(
    'test/fixtures/local/compare-push',
    config,
    'synology:ProjectsSynced/custom-target',
  )

  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/custom-target')
})

test('resolveSyncTask rejects explicit remote paths outside the current sync job', () => {
  const config = createConfig()

  assert.throws(() => resolveSyncTask(
    'test/fixtures/local/compare-push',
    config,
    'synology:AnotherRoot/custom-target',
  ))
})

test('resolveSyncTask throws when no sync job matches the local path', () => {
  const config = createConfig()

  assert.throws(() => resolveSyncTask('test/fixtures/scan/nested', config))
})
