import assert from 'node:assert/strict'
import test from 'node:test'
import { runCli } from '#cli/commands.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

function createOutput() {
  const lines = []
  const errors = []
  return {
    lines,
    errors,
    log(message) {
      lines.push(message)
    },
    error(message) {
      errors.push(message)
    },
  }
}

test('runCli prints list-servers as a table', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
  }, async () => {
    const output = createOutput()
    const exitCode = await runCli(['list-servers'], output)

    assert.equal(exitCode, 0)
    assert.match(output.lines[0], /SERVER/)
    assert.match(output.lines[0], /synology/)
  })
})

test('runCli reports a missing server consistently in text and JSON modes', async () => {
  await withFakeAppRuntime({}, async () => {
    const textOutput = createOutput()
    assert.equal(await runCli(['get-server', 'missing'], textOutput), 1)
    assert.match(textOutput.errors[0], /Server does not exist/)

    const jsonOutput = createOutput()
    assert.equal(await runCli(['get-server', 'missing', '--json'], jsonOutput), 1)
    assert.match(jsonOutput.errors[0], /Server does not exist/)
  })
})

test('runCli prints list-mappings through the app API', async () => {
  await withFakeAppRuntime({
    appConfig: {
      mappings: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/project',
        remoteBasePath: 'Projects',
        filterPatterns: [],
      }],
    },
  }, async () => {
    const output = createOutput()
    const exitCode = await runCli(['list-mappings'], output)

    assert.equal(exitCode, 0)
    assert.match(output.lines[0], /LOCAL/)
    assert.match(output.lines[0], /synology/)
    assert.match(output.lines[0], /\/local\/project/)
  })
})

test('runCli reports invalid adapter arguments without invoking an operation', async () => {
  const output = createOutput()
  const exitCode = await runCli(['create-mapping', 'synology'], output)

  assert.equal(exitCode, 1)
  assert.match(output.errors[0], /Usage: create-mapping/)
})

test('runCli reports a successful server connection query without operation progress', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'nas.local' },
    },
  }, async () => {
    const output = createOutput()
    const exitCode = await runCli(['test-server', 'synology'], output)

    assert.equal(exitCode, 0)
    assert.deepEqual(output.lines, ['Server connection test succeeded.'])
    assert.deepEqual(output.errors, [])
  })
})

test('runCli updates an existing server without accepting a replacement name', async () => {
  await withFakeAppRuntime({
    rcloneConfig: {
      synology: { type: 'sftp', host: 'old.local', user: 'old', pass: 'old' },
    },
  }, async ({ readRcloneState }) => {
    const output = createOutput()
    const exitCode = await runCli([
      'update-server',
      'synology',
      'sftp',
      'host=nas.local',
      'port=22',
      'user=xiaobo',
      'pass=secret',
    ], output)

    assert.equal(exitCode, 0)
    assert.deepEqual(await readRcloneState(), {
      synology: {
        type: 'sftp',
        host: 'nas.local',
        port: '22',
        user: 'xiaobo',
        pass: 'secret',
      },
    })
  })
})

test('runCli rejects legacy sync routing without an explicit sync command', async () => {
  const output = createOutput()
  const exitCode = await runCli(['pull', '/local', 'remote:path'], output)

  assert.equal(exitCode, 1)
  assert.equal(output.errors[0], 'Error: Unknown command: pull')
})
