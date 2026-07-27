const assert = require('node:assert/strict')
const test = require('node:test')
const { getCliCommandArgs, isCliCommandMode } = require('../../../src/cli/dispatch.cjs')

test('isCliCommandMode detects explicit collection commands after Electron runtime args', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    '/Applications/sync-with-rclone.app/Contents/Resources/app.asar/src/electron/main/index.cjs',
    'list-tasks',
    '--json',
  ]

  assert.equal(isCliCommandMode(argv), true)
  assert.deepEqual(getCliCommandArgs(argv), ['list-tasks', '--json'])
})

test('isCliCommandMode detects packaged executable commands without a main script arg', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'list-servers',
  ]

  assert.equal(isCliCommandMode(argv), true)
  assert.deepEqual(getCliCommandArgs(argv), ['list-servers'])
})

test('isCliCommandMode detects application mutation commands', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'create-task',
    'synology',
    '/local/project',
    'Projects',
  ]

  assert.equal(isCliCommandMode(argv), true)
  assert.deepEqual(getCliCommandArgs(argv), argv.slice(1))
})

test('isCliCommandMode leaves normal UI launches alone', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    '--original-process-start-time=123456',
  ]

  assert.equal(isCliCommandMode(argv), false)
  assert.deepEqual(getCliCommandArgs(argv), [])
})

test('getCliCommandArgs preserves explicit sync command arguments', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'sync',
    'push',
    '/local',
    'server:remote',
  ]

  assert.deepEqual(getCliCommandArgs(argv), ['sync', 'push', '/local', 'server:remote'])
})
