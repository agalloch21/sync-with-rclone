import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function withFakeRcloneCommand(behaviors, callback) {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-command-'))
  const executablePath = path.join(temporaryDirectory, 'rclone')
  const behaviorPath = path.join(temporaryDirectory, 'behavior.json')
  const callsPath = path.join(temporaryDirectory, 'calls.jsonl')

  await fs.writeFile(behaviorPath, JSON.stringify(behaviors || {}), 'utf8')
  await fs.writeFile(executablePath, `#!/usr/bin/env node
const fs = require('node:fs')

const args = process.argv.slice(2)
const commandArgs = args[0] === '--config' ? args.slice(2) : args
const command = commandArgs[0]
const filesFromIndex = commandArgs.indexOf('--files-from')
const paths = filesFromIndex === -1
  ? []
  : fs.readFileSync(commandArgs[filesFromIndex + 1], 'utf8').trimEnd().split('\\n').filter(Boolean)
const behaviors = JSON.parse(fs.readFileSync(${JSON.stringify(behaviorPath)}, 'utf8'))
const behavior = behaviors[command] || {}

fs.appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify({ args, paths }) + '\\n')

let stdout = behavior.stdout || ''
let stderr = behavior.stderr || ''
if (behavior.confirmFirstPath && paths[0]) {
  const operation = command === 'delete' ? 'Deleted' : 'Copied (server-side copy)'
  stdout += JSON.stringify({ level: 'info', msg: operation, object: paths[0] }) + '\\n'
}

if (stdout)
  process.stdout.write(stdout)
if (stderr)
  process.stderr.write(stderr)

setTimeout(() => process.exit(behavior.exitCode || 0), behavior.delayMs || 0)
`, 'utf8')
  await fs.chmod(executablePath, 0o755)

  try {
    return await callback({
      runtimePaths: {
        bundledRclonePath: executablePath,
      },
      async readCalls() {
        try {
          const content = await fs.readFile(callsPath, 'utf8')
          return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
        }
        catch (error) {
          if (error?.code === 'ENOENT')
            return []
          throw error
        }
      },
    })
  }
  finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true })
  }
}
