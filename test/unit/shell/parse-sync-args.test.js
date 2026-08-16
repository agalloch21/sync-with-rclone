import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSyncArgs } from '#shell/parse-sync-args.js'

test('parseSyncArgs supports named arguments with equals syntax', () => {
  const result = parseSyncArgs([
    '--mode=push',
    '--local=/Users/me/Documents/project',
    '--remote=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs supports named arguments with separate values', () => {
  const result = parseSyncArgs([
    '--mode',
    'pull',
    '--local',
    '/Users/me/Documents/project',
  ])

  assert.deepEqual(result, {
    mode: 'pull',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: '',
    bypassConfig: false,
  })
})

test('parseSyncArgs falls back to positional arguments for backward compatibility', () => {
  const result = parseSyncArgs([
    'push',
    '/Users/me/Documents/project',
    'fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs ignores packaged runtime argv noise before the sync command', () => {
  const result = parseSyncArgs([
    'C:/Users/agall/AppData/Local/Programs/sync-with-rclone/resources/app.asar/src/shell/index.cjs',
    '--original-process-start-time=123456',
    '.',
    'push',
    'D:/Projects/example-project',
    'fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: 'D:/Projects/example-project',
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
    '/Users/me/Documents/project',
    '--remote',
    'fake-remote:compare-pull',
  ])

  assert.deepEqual(result, {
    mode: 'pull',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: 'fake-remote:compare-pull',
    bypassConfig: false,
  })
})

test('parseSyncArgs accepts legacy named aliases used by helper scripts', () => {
  const result = parseSyncArgs([
    '--mode=push',
    '--folder',
    '/Users/me/Documents/project',
    '--remote-path=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs supports bypassConfig as a CLI flag', () => {
  const result = parseSyncArgs([
    '--bypass-config',
    '--mode=push',
    '--local=/Users/me/Documents/project',
    '--remote=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: true,
  })
})

test('parseSyncArgs supports disabling bypassConfig explicitly', () => {
  const result = parseSyncArgs([
    '--bypass-config=false',
    '--mode=push',
    '--local=/Users/me/Documents/project',
    '--remote=fake-remote:compare-push',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '/Users/me/Documents/project',
    remoteFolderPath: 'fake-remote:compare-push',
    bypassConfig: false,
  })
})

test('parseSyncArgs does not interpret similarly prefixed options as sync options', () => {
  const result = parseSyncArgs([
    '--model=pull',
    '--locality=/unexpected/local',
    '--remote-copy=unexpected:remote',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '',
    remoteFolderPath: '',
    bypassConfig: false,
  })
})

test('parseSyncArgs does not consume another option as a separated value', () => {
  const result = parseSyncArgs([
    '--mode',
    '--local=/expected/local',
    '--remote=expected:remote',
  ])

  assert.deepEqual(result, {
    mode: 'push',
    localFolderPath: '/expected/local',
    remoteFolderPath: 'expected:remote',
    bypassConfig: false,
  })
})
