import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function getFakeRcloneFileName() {
  if (process.platform === 'darwin' && process.arch === 'arm64')
    return 'rclone-osx-arm64'
  if (process.platform === 'darwin' && process.arch === 'x64')
    return 'rclone-osx-amd64'
  if (process.platform === 'win32' && process.arch === 'x64')
    return 'rclone-windows-amd64.exe'
  if (process.platform === 'linux' && process.arch === 'x64')
    return 'rclone-linux-amd64'

  return 'rclone'
}

export async function withFakeAppRuntime({ appConfig = null, rcloneConfig = {} } = {}, callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-runtime-'))
  const resourcesPath = path.join(tempDir, 'resources')
  const binariesPath = path.join(resourcesPath, 'binaries')
  const executablePath = path.join(binariesPath, getFakeRcloneFileName())
  const configDirectory = path.join(tempDir, 'config')
  const configPath = path.join(configDirectory, 'config.json')
  const rcloneConfigPath = path.join(configDirectory, 'rclone.conf')
  const logPath = path.join(tempDir, 'calls.jsonl')
  const statePath = path.join(tempDir, 'rclone-state.json')
  const original = {
    APP_ROOT_PATH: process.env.APP_ROOT_PATH,
    CONFIG_DIRECTORY: process.env.CONFIG_DIRECTORY,
    CONFIG_PATH: process.env.CONFIG_PATH,
    RCLONE_CONFIG_PATH: process.env.RCLONE_CONFIG_PATH,
    resourcesPath: process.resourcesPath,
  }

  await fs.mkdir(binariesPath, { recursive: true })
  await fs.mkdir(configDirectory, { recursive: true })
  await fs.writeFile(statePath, JSON.stringify(rcloneConfig, null, 2), 'utf8')
  if (appConfig)
    await fs.writeFile(configPath, JSON.stringify(appConfig, null, 2), 'utf8')

  await fs.writeFile(executablePath, `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + '\\n')
const statePath = ${JSON.stringify(statePath)}
function readState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'))
}
function commandArgs(args) {
  return args[0] === '--config' ? args.slice(2) : args
}
const command = commandArgs(args)
if (command[0] === 'config' && command[1] === 'dump') {
  process.stdout.write(JSON.stringify(readState()))
  process.exit(0)
}
if (command[0] === 'config' && command[1] === 'create') {
  const state = readState()
  const config = {}
  for (let index = 4; index < command.length && command[index] !== '--obscure' && command[index] !== '--no-obscure'; index += 2)
    config[command[index]] = command[index + 1]
  state[command[2]] = { type: command[3], ...config }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  process.exit(0)
}
if (command[0] === 'config' && command[1] === 'delete') {
  const state = readState()
  delete state[command[2]]
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  process.exit(0)
}
process.exit(0)
`, 'utf8')
  await fs.chmod(executablePath, 0o755)

  process.env.APP_ROOT_PATH = tempDir
  process.env.CONFIG_DIRECTORY = configDirectory
  process.env.CONFIG_PATH = configPath
  process.env.RCLONE_CONFIG_PATH = rcloneConfigPath
  Object.defineProperty(process, 'resourcesPath', {
    value: resourcesPath,
    configurable: true,
  })

  try {
    return await callback({
      tempDir,
      configPath,
      rcloneConfigPath,
      async readCalls() {
        try {
          const content = await fs.readFile(logPath, 'utf8')
          return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
        }
        catch (error) {
          if (error?.code === 'ENOENT')
            return []
          throw error
        }
      },
      async readRcloneState() {
        return JSON.parse(await fs.readFile(statePath, 'utf8'))
      },
    })
  }
  finally {
    for (const [key, value] of Object.entries(original)) {
      if (key === 'resourcesPath') {
        Object.defineProperty(process, 'resourcesPath', {
          value,
          configurable: true,
        })
      }
      else if (value === undefined) {
        delete process.env[key]
      }
      else {
        process.env[key] = value
      }
    }
  }
}
