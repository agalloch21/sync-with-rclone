import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createRemoteConfig,
  deleteRemoteConfig,
  listRemoteConfigs,
  updateRemoteConfig,
} from '#src/infrastructure/rclone/remote-config.js'

async function createFakeRclone({ initialConfig = {}, failLsf = false } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-fake-rclone-'))
  const executablePath = path.join(tempDir, 'rclone')
  const logPath = path.join(tempDir, 'calls.jsonl')
  const statePath = path.join(tempDir, 'state.json')

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
    if (parts[index] === '--obscure')
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

  return {
    runtimePaths: {
      bundledRclonePath: executablePath,
      rcloneConfigPath: path.join(tempDir, 'rclone.conf'),
    },
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

test('listRemoteConfigs returns raw remote records with config', async () => {
  const fakeRclone = await createFakeRclone({
    initialConfig: {
      demo: { type: 'sftp', host: 'nas.local', user: 'xiaobo' },
      webdav: { type: 'webdav', url: 'https://nas.local' },
    },
  })

  assert.deepEqual(await listRemoteConfigs(fakeRclone.runtimePaths), [
    {
      name: 'demo',
      config: { type: 'sftp', host: 'nas.local', user: 'xiaobo' },
    },
    {
      name: 'webdav',
      config: { type: 'webdav', url: 'https://nas.local' },
    },
  ])
})

test('createRemoteConfig writes the supplied protocol config', async () => {
  const fakeRclone = await createFakeRclone()

  await createRemoteConfig('synology', {
    type: 'sftp',
    host: 'nas.local',
    port: '22',
    user: 'xiaobo',
    pass: 'secret',
  }, fakeRclone.runtimePaths)

  assert.deepEqual(await fakeRclone.readState(), {
    synology: {
      type: 'sftp',
      host: 'nas.local',
      port: '22',
      user: 'xiaobo',
      pass: 'secret',
    },
  })
})

test('updateRemoteConfig updates a remote config', async () => {
  const fakeRclone = await createFakeRclone({
    initialConfig: {
      synology: { type: 'sftp', host: 'old.local', port: '22', user: 'old', pass: 'old' },
    },
  })

  await updateRemoteConfig('synology', {
    type: 'sftp',
    host: 'nas.local',
    port: '2222',
    user: 'xiaobo',
    pass: 'secret',
  }, fakeRclone.runtimePaths)

  assert.deepEqual(await fakeRclone.readState(), {
    synology: {
      type: 'sftp',
      host: 'nas.local',
      port: '2222',
      user: 'xiaobo',
      pass: 'secret',
    },
  })
})

test('deleteRemoteConfig deletes a remote config', async () => {
  const fakeRclone = await createFakeRclone({
    initialConfig: {
      synology: { type: 'sftp', host: 'nas.local', port: '22', user: 'xiaobo', pass: 'secret' },
    },
  })

  await deleteRemoteConfig('synology', fakeRclone.runtimePaths)

  assert.deepEqual(await fakeRclone.readState(), {})
})
