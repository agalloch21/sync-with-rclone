import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createRcloneRemote,
  getRcloneRemoteAddress,
  listRcloneRemotes,
  parseRcloneRemotesFromConfigDump,
  testRcloneRemote,
} from '#src/app/rclone-config.js'

test('parseRcloneRemotesFromConfigDump converts rclone config JSON to sorted rclone remotes', () => {
  const remotes = parseRcloneRemotesFromConfigDump(JSON.stringify({
    'synology-sftp': {
      type: 'sftp',
      host: 'nas.local',
      user: 'xiaobo',
    },
    fake: {
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
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-rclone-config-'))
  const rcloneConfigPath = path.join(tempDir, 'rclone.conf')
  await fs.writeFile(rcloneConfigPath, '[demo]\ntype = sftp\n')
  const calls = []
  const runtime = {
    dependents: {
      async runCommand(command, args) {
        calls.push({ command, args })
        return { stdout: JSON.stringify({ demo: { type: 'sftp', host: 'nas.local' } }) }
      },
    },
  }

  const remotes = await listRcloneRemotes({ bundledRclonePath: '/bin/rclone', rcloneConfigPath }, runtime)

  assert.deepEqual(calls, [
    { command: '/bin/rclone', args: ['--config', rcloneConfigPath, 'config', 'dump'] },
  ])
  assert.equal(remotes[0].name, 'demo')
})

test('listRcloneRemotes lets rclone treat a missing config as no remotes', async () => {
  const calls = []
  const remotes = await listRcloneRemotes({
    bundledRclonePath: '/bin/rclone',
    rcloneConfigPath: '/tmp/sync-with-rclone/missing-rclone.conf',
  }, {
    dependents: {
      async runCommand(command, args) {
        calls.push({ command, args })
        return { stdout: '{}' }
      },
    },
  })

  assert.deepEqual(remotes, [])
  assert.deepEqual(calls, [
    {
      command: '/bin/rclone',
      args: ['--config', '/tmp/sync-with-rclone/missing-rclone.conf', 'config', 'dump'],
    },
  ])
})

test('testRcloneRemote probes the remote root', async () => {
  const calls = []
  const runtime = {
    dependents: {
      async runCommand(command, args) {
        calls.push({ command, args })
        return { stdout: '' }
      },
    },
  }

  assert.deepEqual(await testRcloneRemote('synology', { bundledRclonePath: '/bin/rclone', rcloneConfigPath: '/app/rclone.conf' }, runtime), {
    success: true,
  })
  assert.deepEqual(calls, [
    { command: '/bin/rclone', args: ['--config', '/app/rclone.conf', 'lsf', '--max-depth', '1', 'synology:'] },
  ])
})

test('createRcloneRemote tests a temporary config before persisting', async () => {
  const calls = []
  const runtime = {
    dependents: {
      async runCommand(command, args) {
        calls.push({ command, args })
        return { stdout: '' }
      },
    },
  }

  const result = await createRcloneRemote({
    name: 'synology',
    type: 'sftp',
    options: {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    },
  }, { bundledRclonePath: '/bin/rclone', rcloneConfigPath: '/real/rclone.conf' }, runtime)

  assert.equal(result.success, true)
  assert.equal(result.remote.name, 'synology')
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0].args.slice(2), ['config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
  assert.deepEqual(calls[1].args.slice(2), ['lsf', '--max-depth', '1', 'synology:'])
  assert.deepEqual(calls[2], {
    command: '/bin/rclone',
    args: ['--config', '/real/rclone.conf', 'config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'],
  })
})

test('createRcloneRemote stops before persisting when the temporary test fails', async () => {
  const calls = []
  const runtime = {
    dependents: {
      async runCommand(command, args) {
        calls.push({ command, args })
        if (args.includes('lsf')) {
          const error = new Error('probe failed')
          error.stderr = 'connection refused'
          throw error
        }
        return { stdout: '' }
      },
    },
  }

  const result = await createRcloneRemote({
    name: 'synology',
    type: 'sftp',
    options: {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    },
  }, { bundledRclonePath: '/bin/rclone', rcloneConfigPath: '/real/rclone.conf' }, runtime)

  assert.deepEqual(result, { success: false, error: 'connection refused' })
  assert.equal(calls.length, 2)
})
