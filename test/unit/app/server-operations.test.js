import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_DELETE_PROGRESS_STEP,
  SERVER_UPDATE_PROGRESS_STEP,
} from '#src/app/contracts/server.js'
import {
  createServerConnection,
  deleteServerConnection,
  getServerConnection,
  listServerConnections,
  testServerConnection,
  updateServerConnection,
} from '#src/app/operations/server.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'

const originalEnv = {}
const originalResourcesPath = process.resourcesPath

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

for (const key of ['APP_ROOT_PATH', 'CONFIG_DIRECTORY', 'CONFIG_PATH', 'RCLONE_CONFIG_PATH'])
  originalEnv[key] = process.env[key]

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined)
      delete process.env[key]
    else
      process.env[key] = value
  }
  Object.defineProperty(process, 'resourcesPath', {
    value: originalResourcesPath,
    configurable: true,
  })
})

async function createFakeRuntime({ initialConfig = {}, failLsf = false, failDelete = false } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-server-ops-'))
  const resourcesPath = path.join(tempDir, 'resources')
  const binariesPath = path.join(resourcesPath, 'binaries')
  const executablePath = path.join(binariesPath, getFakeRcloneFileName())
  const logPath = path.join(tempDir, 'calls.jsonl')
  const statePath = path.join(tempDir, 'state.json')
  const configDirectory = path.join(tempDir, 'config')
  const configPath = path.join(configDirectory, 'config.json')

  await fs.mkdir(binariesPath, { recursive: true })
  await fs.mkdir(configDirectory, { recursive: true })
  await fs.writeFile(statePath, JSON.stringify(initialConfig, null, 2), 'utf8')
  await fs.writeFile(executablePath, `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + '\\n')
const statePath = ${JSON.stringify(statePath)}
function readState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'))
}
function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}
function commandArgs(args) {
  return args[0] === '--config' ? args.slice(2) : args
}
function optionObject(parts) {
  const result = {}
  for (let index = 0; index < parts.length; index += 2) {
    if (parts[index] === '--obscure' || parts[index] === '--no-obscure')
      break
    result[parts[index]] = parts[index + 1]
  }
  return result
}
const command = commandArgs(args)
if (command[0] === 'config' && command[1] === 'dump') {
  process.stdout.write(JSON.stringify(readState()))
  process.exit(0)
}
if (command[0] === 'config' && command[1] === 'create') {
  const state = readState()
  state[command[2]] = { type: command[3], ...optionObject(command.slice(4)) }
  writeState(state)
  process.exit(0)
}
if (command[0] === 'config' && command[1] === 'update') {
  const state = readState()
  state[command[2]] = { type: command[4], ...optionObject(command.slice(5)) }
  writeState(state)
  process.exit(0)
}
if (command[0] === 'config' && command[1] === 'delete') {
  if (${failDelete ? 'true' : 'false'}) {
    process.stderr.write('delete failed')
    process.exit(1)
  }
  const state = readState()
  delete state[command[2]]
  writeState(state)
  process.exit(0)
}
if (${failLsf ? 'true' : 'false'} && command[0] === 'lsf') {
  process.stderr.write('connection refused')
  process.exit(1)
}
process.exit(0)
`, 'utf8')
  await fs.chmod(executablePath, 0o755)

  process.env.APP_ROOT_PATH = tempDir
  process.env.CONFIG_DIRECTORY = configDirectory
  process.env.CONFIG_PATH = configPath
  process.env.RCLONE_CONFIG_PATH = path.join(configDirectory, 'rclone.conf')
  Object.defineProperty(process, 'resourcesPath', {
    value: resourcesPath,
    configurable: true,
  })

  return {
    configPath,
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
    async readState() {
      return JSON.parse(await fs.readFile(statePath, 'utf8'))
    },
  }
}

async function writeAppConfig(runtime, mappings = []) {
  await fs.writeFile(runtime.configPath, JSON.stringify({
    globalFilterPatterns: [],
    mappings,
  }, null, 2), 'utf8')
}

test('createServerConnection validates, creates, and tests a server connection', async () => {
  const runtime = await createFakeRuntime()
  const events = []

  await createServerConnection('synology', 'sftp', {
    host: ' nas.local ',
    port: '22',
    user: ' xiaobo ',
    pass: ' secret ',
  }, step => events.push(step))

  assert.deepEqual(await runtime.readState(), {
    synology: {
      type: 'sftp',
      host: 'nas.local',
      port: '22',
      user: 'xiaobo',
      pass: 'secret',
    },
  })
  assert.deepEqual((await runtime.readCalls()).map(call => call.slice(2, 4)), [
    ['config', 'dump'],
    ['config', 'create'],
    ['lsf', '--max-depth'],
  ])
  assert.deepEqual(events, [
    SERVER_CREATE_PROGRESS_STEP.SAVE,
    SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION,
  ])
})

test('listServerConnections removes password fields from server config', async () => {
  await createFakeRuntime({
    initialConfig: {
      synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'obscured-password' },
    },
  })

  assert.deepEqual(await listServerConnections(), [
    {
      name: 'synology',
      type: 'sftp',
      address: 'nas.local',
      status: 'unknown',
      config: {
        type: 'sftp',
        host: 'nas.local',
        port: '22',
        user: 'xiaobo',
      },
    },
  ])
})

test('getServerConnection reports a missing server with a stable application error', async () => {
  await createFakeRuntime()

  await assert.rejects(
    () => getServerConnection('missing'),
    error => error.code === APP_ERROR_CODE.SERVER_NOT_FOUND,
  )
})

test('testServerConnection performs a read-only connection check without progress reporting', async () => {
  const runtime = await createFakeRuntime({
    initialConfig: {
      synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
  })

  await testServerConnection('synology')

  assert.deepEqual((await runtime.readCalls()).map(call => call.slice(2, 4)), [
    ['lsf', '--max-depth'],
  ])
})

test('createServerConnection rolls back the remote when connection testing fails', async () => {
  const runtime = await createFakeRuntime({ failLsf: true })
  const events = []

  await assert.rejects(
    () => createServerConnection('synology', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }, step => events.push(step)),
    (error) => {
      assert.equal(error.name, 'AppError')
      assert.equal(error.code, APP_ERROR_CODE.SERVER_CONNECTION_FAILED)
      assert.equal(error.message, 'Server connection failed.')
      assert.ok(error.cause instanceof InfrastructureError)
      assert.equal(error.cause.code, INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED)
      assert.ok(error.cause.cause instanceof Error)
      return true
    },
  )
  assert.deepEqual(await runtime.readState(), {})
  assert.deepEqual(events, [
    SERVER_CREATE_PROGRESS_STEP.SAVE,
    SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION,
    SERVER_CREATE_PROGRESS_STEP.ROLLBACK,
  ])
})

test('createServerConnection reports a failed rollback without replacing the connection error', async () => {
  const runtime = await createFakeRuntime({ failLsf: true, failDelete: true })
  const events = []

  await assert.rejects(
    () => createServerConnection('synology', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }, step => events.push(step)),
    {
      name: 'AppError',
      code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
      message: 'Server connection failed.',
    },
  )
  assert.deepEqual(events, [
    SERVER_CREATE_PROGRESS_STEP.SAVE,
    SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION,
    SERVER_CREATE_PROGRESS_STEP.ROLLBACK,
  ])
  assert.deepEqual(await runtime.readState(), {
    synology: {
      type: 'sftp',
      host: 'nas.local',
      port: '22',
      user: 'xiaobo',
      pass: 'secret',
    },
  })
})

test('createServerConnection maps duplicate backend remote to server already exists', async () => {
  await createFakeRuntime({
    initialConfig: {
      synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
  })

  const events = []
  await assert.rejects(
    () => createServerConnection('synology', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }, step => events.push(step)),
    {
      name: 'AppError',
      code: APP_ERROR_CODE.SERVER_ALREADY_EXISTS,
      message: 'Server already exists.',
    },
  )
  assert.deepEqual(events, ['save'])
})

test('updateServerConnection maps missing backend remote to server not found', async () => {
  await createFakeRuntime()

  await assert.rejects(
    () => updateServerConnection('missing', 'sftp', {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    }),
    {
      name: 'AppError',
      code: APP_ERROR_CODE.SERVER_NOT_FOUND,
      message: 'Server does not exist.',
    },
  )
})

test('createServerConnection throws AppError for invalid protocol fields', async () => {
  await createFakeRuntime()

  await assert.rejects(
    () => createServerConnection('synology', 'sftp', {
      host: '',
      port: 0,
      user: '',
      pass: '',
    }),
    (error) => {
      assert.equal(error.name, 'AppError')
      assert.equal(error.code, APP_ERROR_CODE.SERVER_VALIDATION_FAILED)
      assert.equal(error.cause, undefined)
      return true
    },
  )
})

test('updateServerConnection updates an existing server connection', async () => {
  const runtime = await createFakeRuntime({
    initialConfig: {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'old', pass: 'old' },
    },
  })

  const progress = []
  await updateServerConnection('synology', 'sftp', {
    host: 'nas.local',
    port: 2222,
    user: 'xiaobo',
    pass: 'secret',
  }, step => progress.push(step))

  assert.deepEqual(await runtime.readState(), {
    synology: {
      type: 'sftp',
      host: 'nas.local',
      port: '2222',
      user: 'xiaobo',
      pass: 'secret',
    },
  })
  assert.deepEqual(progress, [SERVER_UPDATE_PROGRESS_STEP.SAVE])
})

test('deleteServerConnection emits its delete step inside the server operation', async () => {
  const runtime = await createFakeRuntime({
    initialConfig: {
      synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
  })
  await writeAppConfig(runtime)

  const progress = []
  await deleteServerConnection('synology', step => progress.push(step))

  assert.deepEqual(await runtime.readState(), {})
  assert.deepEqual(progress, [SERVER_DELETE_PROGRESS_STEP.DELETE])
})

test('deleteServerConnection rejects servers with active mappings', async () => {
  const runtime = await createFakeRuntime({
    initialConfig: {
      synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
  })
  await writeAppConfig(runtime, [{
    displayName: 'Projects',
    rcloneRemote: 'synology',
    localBasePath: runtime.configPath,
    remoteBasePath: 'Projects',
    filterPatterns: [],
    lastSyncMode: null,
    lastSyncFolder: null,
    lastSyncDate: null,
  }])

  await assert.rejects(
    () => deleteServerConnection('synology'),
    error => error?.code === APP_ERROR_CODE.SERVER_HAS_MAPPINGS,
  )
  assert.deepEqual(await runtime.readState(), {
    synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'secret' },
  })
})
