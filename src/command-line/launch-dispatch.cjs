const CLI_COMMAND_NAMES = require('./command-names.cjs')

const CLI_COMMANDS = new Set(CLI_COMMAND_NAMES)
const SESSION_FLAGS = new Set(['--session', '--sync-session'])

function getApplicationArgs(argv) {
  const args = argv.slice(1)
  const firstArg = args[0] || ''
  const isElectronMainEntry = /(?:^|[\\/])src[\\/]electron[\\/]main[\\/]index\.(?:cjs|js)$/.test(firstArg)

  return isElectronMainEntry ? args.slice(1) : args
}

function classifyLaunch(argv = process.argv) {
  const rawArgs = argv.slice(1)
  if (rawArgs.some(arg => SESSION_FLAGS.has(arg)))
    return { type: 'session', argv: rawArgs }

  const applicationArgs = getApplicationArgs(argv)
  if (CLI_COMMANDS.has(applicationArgs[0]))
    return { type: 'cli', argv: applicationArgs }

  return { type: 'main', argv: rawArgs }
}

function isDesktopLaunchRequest(value) {
  return value
    && (value.type === 'main' || value.type === 'session')
    && Array.isArray(value.argv)
    && value.argv.every(arg => typeof arg === 'string')
}

async function runCliCommand(argv, output = console) {
  const { runCli } = await import('#src/cli/commands.js')
  return runCli(argv, output)
}

module.exports = {
  classifyLaunch,
  isDesktopLaunchRequest,
  runCliCommand,
}
