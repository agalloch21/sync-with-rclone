const { CLI_COMMAND_NAMES } = require('./cli/command-contract.cjs')

const CLI_COMMANDS = new Set(CLI_COMMAND_NAMES)
const SESSION_FLAGS = new Set(['--session', '--sync-session'])

function getApplicationArgs(argv) {
  const args = argv.slice(1)
  const firstArg = args[0] || ''
  const isApplicationEntry = /(?:^|[\\/])src[\\/]shell[\\/]index\.(?:cjs|js)$/.test(firstArg)

  return isApplicationEntry ? args.slice(1) : args
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

module.exports = {
  classifyLaunch,
  isDesktopLaunchRequest,
}
