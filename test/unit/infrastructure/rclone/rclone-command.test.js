import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  buildRcloneArgs,
  createBatchPathsFileContent,
  createRcloneCommand,
  getRcloneExecutable,
  parseConfirmedFilesFromOutput,
  withBatchFile,
} from '#src/infrastructure/rclone/rclone-command.js'

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

test('getRcloneExecutable uses bundled rclone when available', () => {
  assert.equal(getRcloneExecutable({ bundledRclonePath: '/app/bin/rclone' }), '/app/bin/rclone')
  assert.equal(getRcloneExecutable(), 'rclone')
})

test('buildRcloneArgs prepends config when available', () => {
  assert.deepEqual(buildRcloneArgs({ rcloneConfigPath: '/app/rclone.conf' }, ['lsf', 'remote:path']), [
    '--config',
    '/app/rclone.conf',
    'lsf',
    'remote:path',
  ])
})

test('createRcloneCommand returns executable and configured args', () => {
  assert.deepEqual(createRcloneCommand({
    bundledRclonePath: '/app/bin/rclone',
    rcloneConfigPath: '/app/rclone.conf',
  }, ['mkdir', 'remote:path']), {
    command: '/app/bin/rclone',
    args: ['--config', '/app/rclone.conf', 'mkdir', 'remote:path'],
  })
})

test('createBatchPathsFileContent writes one path per line with trailing newline', () => {
  assert.equal(createBatchPathsFileContent(['one.txt', 'nested/two.txt']), 'one.txt\nnested/two.txt\n')
})

test('withBatchFile removes the temp directory after a successful callback', async () => {
  let batchFilePath = null
  let paths = null

  await withBatchFile(['one.txt', 'two.txt'], async (filePath) => {
    batchFilePath = filePath
    paths = (await fs.readFile(filePath, 'utf8')).trimEnd().split('\n')
  })

  assert.deepEqual(paths, ['one.txt', 'two.txt'])
  assert.equal(await pathExists(path.dirname(batchFilePath)), false)
})

test('withBatchFile removes the temp directory after a failed callback', async () => {
  let batchFilePath = null

  await assert.rejects(() => withBatchFile(['one.txt'], async (filePath) => {
    batchFilePath = filePath
    throw new Error('command failed')
  }), /command failed/)

  assert.equal(await pathExists(path.dirname(batchFilePath)), false)
})

test('withBatchFile preserves primitive callback errors', async () => {
  const primitiveError = 0

  await assert.rejects(() => withBatchFile(['one.txt'], async () => {
    throw primitiveError
  }), error => error === primitiveError)
})

test('parseConfirmedFilesFromOutput uses copy success JSON only', () => {
  assert.deepEqual(parseConfirmedFilesFromOutput([
    '+ queued.txt',
    '= identical.txt',
    '{"level":"info","msg":"There was nothing to transfer"}',
    '{"level":"error","msg":"Failed to copy","object":"failed.txt"}',
    '{"level":"notice","msg":"Failed to copy","object":"notice.txt"}',
    '{"level":"info","msg":"Copied (server-side copy)","object":"copied.txt"}',
  ].join('\n'), 'copy'), ['copied.txt'])
})

test('parseConfirmedFilesFromOutput uses delete success JSON only', () => {
  assert.deepEqual(parseConfirmedFilesFromOutput([
    '{"level":"info","msg":"Deleted","object":"deleted.txt"}',
    '{"level":"info","msg":"There was nothing to delete"}',
    '{"level":"error","msg":"Failed to delete","object":"failed.txt"}',
    '{"level":"info","msg":"Copied (server-side copy)","object":"copied.txt"}',
  ].join('\n'), 'delete'), ['deleted.txt'])
})
