import { runCli } from './commands.js'

const exitCode = await runCli(process.argv.slice(2))
if (exitCode !== 0)
  process.exit(exitCode)
