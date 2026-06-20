import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createRcloneRemote,
  deleteRcloneRemote,
  getRcloneRemoteAddress,
  listRcloneRemotes,
  parseRcloneRemotesFromConfigDump,
  testRcloneRemote,
  updateRcloneRemote,
} from '#src/app/rclone-config.js'

async function createFakeRclone({ dump = '{}', failLsf = false } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-fake-rclone-'))
  const executablePath = path.join(tempDir, 'rclone')
  const logPath = path.join(tempDir, 'calls.jsonl')

  await fs.writeFile(executablePath, `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + '\\n')
if (args.includes('config') && args.includes('dump')) {
  process.stdout.write(${JSON.stringify(dump)})
  process.exit(0)
}
if (${failLsf ? 'true' : 'false'} && args.includes('lsf')) {
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
  }
}

test('parseRcloneRemotesFromConfigDump converts rclone config JSON to sorted rclone remotes', () => {
  const remotes = parseRcloneRemotesFromConfigDump(JSON.stringify({
    'synology-sftp': {
      type: 'sftp',
      host: 'nas.local',
      user: 'xiaobo',
    },
    'fake': {
      type: 'alias',
      remote: '/tmp/fake',
    },
  }))

  assert.deepEqual(remotes, [
    {
      name: 'fake',
      type: 'alias',
      remote: '/tmp/fake',
    },
    {
      name: 'synology-sftp',
      type: 'sftp',
      host: 'nas.local',
      user: 'xiaobo',
    },
  ])
})

test('getRcloneRemoteAddress normalizes protocol-specific address fields for display', () => {
  assert.equal(getRcloneRemoteAddress({ host: 'nas.local' }), 'nas.local')
  assert.equal(getRcloneRemoteAddress({ url: 'https://nas.local' }), 'https://nas.local')
  assert.equal(getRcloneRemoteAddress({ remote: '/tmp/fake' }), '/tmp/fake')
  assert.equal(getRcloneRemoteAddress({ endpoint: 's3.local' }), 's3.local')
})

test('listRcloneRemotes runs rclone config dump', async () => {
  const fakeRclone = await createFakeRclone({
    dump: JSON.stringify({ demo: { type: 'sftp', host: 'nas.local' } }),
  })
  const remotes = await listRcloneRemotes(fakeRclone.runtimePaths)

  assert.deepEqual(await fakeRclone.readCalls(), [
    ['--config', fakeRclone.runtimePaths.rcloneConfigPath, 'config', 'dump'],
  ])
  assert.equal(remotes[0].name, 'demo')
})

test('listRcloneRemotes lets rclone treat a missing config as no remotes', async () => {
  const fakeRclone = await createFakeRclone()
  const remotes = await listRcloneRemotes(fakeRclone.runtimePaths)

  assert.deepEqual(remotes, [])
  assert.deepEqual(await fakeRclone.readCalls(), [
    ['--config', fakeRclone.runtimePaths.rcloneConfigPath, 'config', 'dump'],
  ])
})

test('testRcloneRemote probes the remote root', async () => {
  const fakeRclone = await createFakeRclone()

  assert.deepEqual(await testRcloneRemote('synology', fakeRclone.runtimePaths), {
    success: true,
  })
  assert.deepEqual(await fakeRclone.readCalls(), [
    ['--config', fakeRclone.runtimePaths.rcloneConfigPath, 'lsf', '--max-depth', '1', 'synology:'],
  ])
})

test('createRcloneRemote normalizes a flat remote before testing a temporary config', async () => {
  const fakeRclone = await createFakeRclone()

  const result = await createRcloneRemote({
    name: 'synology',
    type: 'sftp',
    host: ' nas.local ',
    port: '22',
    user: ' xiaobo ',
    pass: ' secret ',
  }, fakeRclone.runtimePaths)

  assert.equal(result.success, true)
  assert.equal(result.remote.name, 'synology')
  const calls = await fakeRclone.readCalls()
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0].slice(2), ['config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
  assert.deepEqual(calls[1].slice(2), ['lsf', '--max-depth', '1', 'synology:'])
  assert.deepEqual(calls[2], ['--config', fakeRclone.runtimePaths.rcloneConfigPath, 'config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
})

test('createRcloneRemote stops before persisting when the temporary test fails', async () => {
  const fakeRclone = await createFakeRclone({ failLsf: true })

  const result = await createRcloneRemote({
    name: 'synology',
    type: 'sftp',
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  }, fakeRclone.runtimePaths)

  assert.deepEqual(result, {
    success: false,
    code: 'rclone.connection_failed',
    message: 'Could not connect to the server.',
    detail: 'connection refused',
  })
  assert.equal((await fakeRclone.readCalls()).length, 2)
})

test('updateRcloneRemote normalizes a flat remote before updating the real remote', async () => {
  const fakeRclone = await createFakeRclone()

  const result = await updateRcloneRemote({
    name: 'synology',
    type: 'sftp',
    host: 'nas.local',
    port: '22',
    user: 'xiaobo',
    pass: 'secret',
  }, fakeRclone.runtimePaths)

  assert.equal(result.success, true)
  assert.equal(result.remote.name, 'synology')
  const calls = await fakeRclone.readCalls()
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0].slice(2), ['config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
  assert.deepEqual(calls[1].slice(2), ['lsf', '--max-depth', '1', 'synology:'])
  assert.deepEqual(calls[2], ['--config', fakeRclone.runtimePaths.rcloneConfigPath, 'config', 'update', 'synology', 'type', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
})

test('updateRcloneRemote stops before updating when the temporary test fails', async () => {
  const fakeRclone = await createFakeRclone({ failLsf: true })

  const result = await updateRcloneRemote({
    name: 'synology',
    type: 'sftp',
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  }, fakeRclone.runtimePaths)

  assert.deepEqual(result, {
    success: false,
    code: 'rclone.connection_failed',
    message: 'Could not connect to the server.',
    detail: 'connection refused',
  })
  assert.equal((await fakeRclone.readCalls()).length, 2)
})

test('createRcloneRemote returns field errors for unsupported protocol type', async () => {
  const fakeRclone = await createFakeRclone()

  assert.deepEqual(await createRcloneRemote({
    name: 'synology',
    type: 'unknown',
  }, fakeRclone.runtimePaths), {
    success: false,
    code: 'rclone.invalid_remote',
    message: 'Remote settings are invalid.',
    fieldErrors: {
      type: 'Unsupported protocol.',
    },
  })
  assert.deepEqual(await fakeRclone.readCalls(), [])
})

test('deleteRcloneRemote deletes a named rclone remote', async () => {
  const fakeRclone = await createFakeRclone()

  assert.deepEqual(await deleteRcloneRemote('synology', fakeRclone.runtimePaths), {
    success: true,
  })
  assert.deepEqual(await fakeRclone.readCalls(), [
    ['--config', fakeRclone.runtimePaths.rcloneConfigPath, 'config', 'delete', 'synology'],
  ])
})
