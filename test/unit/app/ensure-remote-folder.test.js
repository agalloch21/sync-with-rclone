import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { ensureRemoteFolderExists } from '#src/app/sync-session/ensure-remote-folder.js'

function createRuntime(runCommand) {
  return {
    dependents: {
      runCommand,
    },
  }
}

test('ensureRemoteFolderExists probes the remote folder and skips mkdir when it exists', async () => {
  const commands = []

  const result = await ensureRemoteFolderExists(
    'synology:ProjectsSynced/app',
    {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
    createRuntime(async (command, args) => {
      commands.push({ command, args })
    }),
  )

  assert.deepEqual(result, { created: false })
  assert.deepEqual(commands, [
    {
      command: '/app/bin/rclone',
      args: ['--config', '/app/rclone.conf', 'lsf', '--max-depth', '1', 'synology:ProjectsSynced/app'],
    },
  ])
})

test('ensureRemoteFolderExists creates the remote folder when the probe returns not found', async () => {
  const commands = []

  const result = await ensureRemoteFolderExists(
    'synology:ProjectsSynced/new-app',
    {
      rcloneConfigPath: '/app/rclone.conf',
      bundledRclonePath: '/app/bin/rclone',
    },
    createRuntime(async (command, args) => {
      commands.push({ command, args })
      if (args.includes('lsf')) {
        const error = new Error('directory not found')
        error.code = 3
        throw error
      }
    }),
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

test('ensureRemoteFolderExists fails without creating when the probe has another error', async () => {
  const commands = []
  const probeError = new Error('auth failed')
  probeError.code = 5

  await assert.rejects(
    () => ensureRemoteFolderExists(
      'synology:ProjectsSynced/app',
      {},
      createRuntime(async (command, args) => {
        commands.push({ command, args })
        throw probeError
      }),
    ),
    {
      name: 'AppError',
      code: APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED,
      message: 'auth failed',
    },
  )

  assert.equal(commands.length, 1)
  assert.deepEqual(commands[0], {
    command: 'rclone',
    args: ['lsf', '--max-depth', '1', 'synology:ProjectsSynced/app'],
  })
})
