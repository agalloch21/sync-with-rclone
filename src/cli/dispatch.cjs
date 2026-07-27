const CLI_COMMANDS = new Set([
  'sync',
  'list-servers',
  'get-server',
  'list-server-folders',
  'test-server',
  'create-server',
  'update-server',
  'delete-server',
  'list-tasks',
  'create-task',
  'update-task',
  'update-task-ignore-patterns',
  'delete-task',
  'list-global-ignore-patterns',
  'update-global-ignore-patterns',
])
const LEGACY_SYNC_MODES = new Set(['push', 'pull'])

function findCliCommandIndex(argv = process.argv) {
  const args = argv.slice(1)
  return args.findIndex(arg => CLI_COMMANDS.has(arg) || LEGACY_SYNC_MODES.has(arg))
}

function getCliCommandArgs(argv = process.argv) {
  const commandIndex = findCliCommandIndex(argv)
  if (commandIndex < 0)
    return []

  return argv.slice(1 + commandIndex)
}

function isCliCommandMode(argv = process.argv) {
  return getCliCommandArgs(argv).length > 0
}

async function runCliCommand(argv = process.argv, output = console) {
  const { runCli } = await import('#src/cli/commands.js')
  return runCli(getCliCommandArgs(argv), output)
}

module.exports = {
  getCliCommandArgs,
  isCliCommandMode,
  runCliCommand,
}
