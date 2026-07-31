import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listRemoteFolderEntries,
  parseRemoteFolderEntries,
} from '#src/infrastructure/rclone/remote-files.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('parseRemoteFolderEntries rejects malformed and non-array JSON', () => {
  assert.throws(() => parseRemoteFolderEntries('{broken', 'synology'), error => error?.code === 'rclone.parse_failed')
  assert.throws(() => parseRemoteFolderEntries('{}', 'synology'), error => error?.code === 'rclone.parse_failed')
})

test('listRemoteFolderEntries maps command failures to a stable rclone error', async () => {
  await assert.rejects(
    () => listRemoteFolderEntries('synology', '', { bundledRclonePath: process.execPath }),
    error => error?.code === 'rclone.command_failed',
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
