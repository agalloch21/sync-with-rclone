const assert = require('node:assert/strict')
const test = require('node:test')
const {
  classifyLaunch,
  isDesktopLaunchRequest,
} = require('../../../src/command-line/launch-dispatch.cjs')

test('classifyLaunch detects CLI commands after the Electron main entry', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    '/Applications/sync-with-rclone.app/Contents/Resources/app.asar/src/electron/main/index.cjs',
    'list-tasks',
    '--json',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'cli',
    argv: ['list-tasks', '--json'],
  })
})

test('classifyLaunch detects packaged CLI commands without a main entry argument', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'create-task',
    'synology',
    '/local/project',
    'Projects',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'cli',
    argv: argv.slice(1),
  })
})

test('classifyLaunch requires a formal CLI command in the first application argument', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    '--original-process-start-time=123456',
    'list-tasks',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'main',
    argv: argv.slice(1),
  })
})

test('classifyLaunch no longer treats legacy sync modes as top-level commands', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'push',
    '/local',
    'server:remote',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'main',
    argv: argv.slice(1),
  })
})

test('classifyLaunch gives an explicit session flag priority over command-like arguments', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'sync',
    '--session',
    '--mode=push',
    '--local=/local/list-tasks',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'session',
    argv: argv.slice(1),
  })
})

test('isDesktopLaunchRequest validates serialized single-instance requests', () => {
  assert.equal(isDesktopLaunchRequest({ type: 'main', argv: [] }), true)
  assert.equal(isDesktopLaunchRequest({ type: 'session', argv: ['--session'] }), true)
  assert.equal(isDesktopLaunchRequest({ type: 'cli', argv: ['list-tasks'] }), false)
  assert.equal(isDesktopLaunchRequest({ type: 'main', argv: [1] }), false)
})
