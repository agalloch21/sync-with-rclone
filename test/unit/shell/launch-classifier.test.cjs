const assert = require('node:assert/strict')
const test = require('node:test')
const { CLI_COMMAND, CLI_COMMAND_NAMES } = require('../../../src/shell/cli/command-contract.cjs')
const {
  classifyLaunch,
  isDesktopLaunchRequest,
} = require('../../../src/shell/launch-classifier.cjs')

test('CLI command contract exposes unique canonical command names', () => {
  assert.equal(new Set(CLI_COMMAND_NAMES).size, CLI_COMMAND_NAMES.length)
  assert.deepEqual(CLI_COMMAND_NAMES, Object.values(CLI_COMMAND))
})

test('classifyLaunch recognizes every canonical CLI command', () => {
  for (const command of CLI_COMMAND_NAMES) {
    assert.equal(classifyLaunch(['/app/sync-with-rclone', command]).type, 'cli')
  }
})

test('classifyLaunch detects CLI commands after the application entry', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    '/Applications/sync-with-rclone.app/Contents/Resources/app.asar/src/shell/index.cjs',
    'list-mappings',
    '--json',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'cli',
    argv: ['list-mappings', '--json'],
  })
})

test('classifyLaunch detects packaged CLI commands without a main entry argument', () => {
  const argv = [
    '/Applications/sync-with-rclone.app/Contents/MacOS/sync-with-rclone',
    'create-mapping',
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
    'list-mappings',
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
    '--local=/local/list-mappings',
  ]

  assert.deepEqual(classifyLaunch(argv), {
    type: 'session',
    argv: argv.slice(1),
  })
})

test('isDesktopLaunchRequest validates serialized single-instance requests', () => {
  assert.equal(isDesktopLaunchRequest({ type: 'main', argv: [] }), true)
  assert.equal(isDesktopLaunchRequest({ type: 'session', argv: ['--session'] }), true)
  assert.equal(isDesktopLaunchRequest({ type: 'cli', argv: ['list-mappings'] }), false)
  assert.equal(isDesktopLaunchRequest({ type: 'main', argv: [1] }), false)
})
