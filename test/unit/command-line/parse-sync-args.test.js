import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSyncArgs } from '#src/command-line/parse-sync-args.js'

test('parseSyncArgs supports named arguments with equals syntax', () => {
  const result = parseSyncArgs([
    '--mode=push',
    '--local=test/fixtures/local/compare-push',
    '--remote=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs supports named arguments with separate values', () => {
  const result = parseSyncArgs([
    '--mode',
    'pull',
    '--local',
    'test/fixtures/local/compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'pull',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: '',
    bypassConfig: false,
  })
})

test('parseSyncArgs falls back to positional arguments for backward compatibility', () => {
  const result = parseSyncArgs([
    'push',
    'test/fixtures/local/compare-push',
    'fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs ignores packaged runtime argv noise before the sync command', () => {
  const result = parseSyncArgs([
    'C:/Users/agall/AppData/Local/Programs/sync-with-rclone/resources/app.asar/src/electron/main/index.cjs',
    '--original-process-start-time=123456',
    '.',
    'push',
    'D:/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/test/fixtures/local/compare-push',
    'fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'D:/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs prefers named arguments over positional noise', () => {
  const result = parseSyncArgs([
    'C:/Users/agall/AppData/Local/Programs/sync-with-rclone/sync-with-rclone.exe',
    'push',
    '--mode=pull',
    '--local',
    'test/fixtures/local/compare-push',
    '--remote',
    'fake-remote:compare-pull',
  ])

  assert.deepEqual(result, {
    mode: 'pull',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-pull',
    bypassConfig: false,
  })
})

test('parseSyncArgs accepts legacy named aliases used by helper scripts', () => {
  const result = parseSyncArgs([
    '--mode=push',
    '--folder',
    'test/fixtures/local/compare-push',
    '--remote-path=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs supports bypassConfig as a CLI flag', () => {
  const result = parseSyncArgs([
    '--bypass-config',
    '--mode=push',
    '--local=test/fixtures/local/compare-push',
    '--remote=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: true,
  })
})

test('parseSyncArgs supports disabling bypassConfig explicitly', () => {
  const result = parseSyncArgs([
    '--bypass-config=false',
    '--mode=push',
    '--local=test/fixtures/local/compare-push',
    '--remote=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'test/fixtures/local/compare-push',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})
