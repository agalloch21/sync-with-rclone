import assert from 'node:assert/strict'
import test from 'node:test'
import { INFRASTRUCTURE_ERROR_CODE } from '#src/infrastructure/infrastructure-error.js'
import {
  listRemoteFiles,
  listRemoteFolderEntries,
  parseRemoteFolderEntries,
} from '#src/infrastructure/rclone/remote-files.js'
import { withFakeRcloneCommand } from '#test/helpers/fake-rclone-command.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('parseRemoteFolderEntries rejects malformed and non-array JSON', () => {
  assert.throws(() => parseRemoteFolderEntries('{broken', 'synology'), error => error?.code === INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED)
  assert.throws(() => parseRemoteFolderEntries('{}', 'synology'), error => error?.code === INFRASTRUCTURE_ERROR_CODE.RCLONE_PARSE_FAILED)
})

test('listRemoteFolderEntries maps command failures to a stable rclone error', async () => {
  await assert.rejects(
    () => listRemoteFolderEntries('synology', '', { bundledRclonePath: process.execPath }),
    error => error?.code === INFRASTRUCTURE_ERROR_CODE.RCLONE_COMMAND_FAILED,
  )
})

test('listRemoteFolderEntries limits the initial folder listing to one level', async () => {
  await withFakeAppRuntime({}, async ({ readCalls }) => {
    await listRemoteFolderEntries('synology')
    const calls = await readCalls()

    assert.deepEqual(calls[0], [
      '--config',
      process.env.RCLONE_CONFIG_PATH,
      'lsjson',
      '--max-depth',
      '1',
      '--dirs-only',
      '--no-mimetype',
      'synology:',
    ])
  })
})

test('listRemoteFolderEntries lists one level below the requested folder', async () => {
  await withFakeAppRuntime({}, async ({ readCalls }) => {
    await listRemoteFolderEntries('synology', 'Projects/Current')
    const calls = await readCalls()

    assert.equal(calls[0].at(-1), 'synology:Projects/Current')
  })
})

test('listRemoteFiles identifies a missing remote folder', async () => {
  await withFakeRcloneCommand({
    lsjson: {
      exitCode: 3,
      stderr: 'directory not found',
    },
  }, async ({ runtimePaths }) => {
    await assert.rejects(
      () => listRemoteFiles('synology:Projects/Missing', runtimePaths),
      {
        name: 'InfrastructureError',
        code: INFRASTRUCTURE_ERROR_CODE.REMOTE_FOLDER_NOT_FOUND,
        message: 'Remote folder was not found.',
        detail: 'directory not found',
      },
    )
  })
})
