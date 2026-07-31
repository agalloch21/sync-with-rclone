import assert from 'node:assert/strict'
import test from 'node:test'
import { INFRASTRUCTURE_ERROR_CODE } from '#src/infrastructure/infrastructure-error.js'
import { ensureRemoteFolder } from '#src/infrastructure/rclone/remote-files.js'
import { withFakeRcloneCommand } from '../../../helpers/fake-rclone-command.js'

test('ensureRemoteFolder probes the remote folder and skips mkdir when it exists', async () => {
  await withFakeRcloneCommand({}, async ({ runtimePaths, readCalls }) => {
    const result = await ensureRemoteFolder('synology:ProjectsSynced/app', {
      ...runtimePaths,
      rcloneConfigPath: '/app/rclone.conf',
    })

    assert.deepEqual(result, { created: false })
    assert.deepEqual((await readCalls()).map(call => call.args), [[
      '--config',
      '/app/rclone.conf',
      'lsf',
      '--max-depth',
      '1',
      'synology:ProjectsSynced/app',
    ]])
  })
})

test('ensureRemoteFolder creates the remote folder when the probe returns not found', async () => {
  await withFakeRcloneCommand({
    lsf: { exitCode: 3 },
  }, async ({ runtimePaths, readCalls }) => {
    const result = await ensureRemoteFolder('synology:ProjectsSynced/new-app', {
      ...runtimePaths,
      rcloneConfigPath: '/app/rclone.conf',
    })

    assert.deepEqual(result, { created: true })
    assert.deepEqual((await readCalls()).map(call => call.args), [
      ['--config', '/app/rclone.conf', 'lsf', '--max-depth', '1', 'synology:ProjectsSynced/new-app'],
      ['--config', '/app/rclone.conf', 'mkdir', 'synology:ProjectsSynced/new-app'],
    ])
  })
})

test('ensureRemoteFolder fails without creating when the probe has another error', async () => {
  await withFakeRcloneCommand({
    lsf: { exitCode: 5 },
  }, async ({ runtimePaths, readCalls }) => {
    await assert.rejects(
      () => ensureRemoteFolder('synology:ProjectsSynced/app', runtimePaths),
      {
        name: 'InfrastructureError',
        code: INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED,
      },
    )

    const calls = await readCalls()
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].args, [
      'lsf',
      '--max-depth',
      '1',
      'synology:ProjectsSynced/app',
    ])
  })
})
