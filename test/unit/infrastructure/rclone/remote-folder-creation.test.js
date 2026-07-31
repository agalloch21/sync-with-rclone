import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureRemoteFolder } from '#src/infrastructure/rclone/remote-files.js'

test('ensureRemoteFolder probes the remote folder and skips mkdir when it exists', async () => {
  const commands = []

  const result = await ensureRemoteFolder(
    'synology:ProjectsSynced/app',
    {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
    {
      runCommand: async (command, args) => {
        commands.push({ command, args })
      },
    },
  )

  assert.deepEqual(result, { created: false })
  assert.deepEqual(commands, [
    {
      command: '/app/bin/rclone',
      args: ['--config', '/app/rclone.conf', 'lsf', '--max-depth', '1', 'synology:ProjectsSynced/app'],
    },
  ])
})

test('ensureRemoteFolder creates the remote folder when the probe returns not found', async () => {
  const commands = []

  const result = await ensureRemoteFolder(
    'synology:ProjectsSynced/new-app',
    {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
    {
      runCommand: async (command, args) => {
        commands.push({ command, args })
        if (args.includes('lsf')) {
          const error = new Error('directory not found')
          error.code = 3
          throw error
        }
      },
    },
  )

  assert.deepEqual(result, { created: true })
  assert.deepEqual(commands, [
    {
      command: '/app/bin/rclone',
      args: ['--config', '/app/rclone.conf', 'lsf', '--max-depth', '1', 'synology:ProjectsSynced/new-app'],
    },
    {
      command: '/app/bin/rclone',
      args: ['--config', '/app/rclone.conf', 'mkdir', 'synology:ProjectsSynced/new-app'],
    },
  ])
})

test('ensureRemoteFolder fails without creating when the probe has another error', async () => {
  const commands = []
  const probeError = new Error('auth failed')
  probeError.code = 5

  await assert.rejects(
    () => ensureRemoteFolder(
      'synology:ProjectsSynced/app',
      {},
      {
        runCommand: async (command, args) => {
          commands.push({ command, args })
          throw probeError
        },
      },
    ),
    {
      name: 'InfrastructureError',
      code: 'remote.folder_probe_failed',
      message: 'auth failed',
    },
  )

  assert.equal(commands.length, 1)
  assert.deepEqual(commands[0], {
    command: 'rclone',
    args: ['lsf', '--max-depth', '1', 'synology:ProjectsSynced/app'],
  })
})
