import assert from 'node:assert/strict'
import test from 'node:test'
import { runCli } from '#src/cli/commands.js'
import { SYNC_RESULT } from '#src/core/contract.js'

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
  const output = createOutput()
  const exitCode = await runCli(['list-servers'], output, {
    dependents: {
      async listRcloneRemotes() {
        return [{ name: 'synology', type: 'sftp', host: 'nas.local' }]
      },
    },
  })

  assert.equal(exitCode, 0)
  assert.match(output.lines[0], /SERVER/)
  assert.match(output.lines[0], /synology/)
})

test('runCli prints list-tasks as JSON', async () => {
  const output = createOutput()
  const exitCode = await runCli(['list-tasks', '--json'], output, {
    dependents: {
      async loadAppModel() {
        return {
          globalIgnorePatterns: ['.DS_Store'],
          syncTasks: [
            {
              name: 'Projects',
              rcloneRemote: 'synology',
              localBasePath: '/local',
              remoteBasePath: 'Projects',
              lastSyncMode: null,
              lastSyncFolder: null,
              lastSyncDate: null,
            },
          ],
        }
      },
    },
  })

  assert.equal(exitCode, 0)
  assert.deepEqual(JSON.parse(output.lines[0]), {
    globalIgnorePatterns: ['.DS_Store'],
    syncTasks: [
      {
        name: 'Projects',
        rcloneRemote: 'synology',
        localBasePath: '/local',
        remoteBasePath: 'Projects',
        lastSyncMode: null,
        lastSyncFolder: null,
        lastSyncDate: null,
      },
    ],
  })
})

test('runCli routes sync subcommand to existing sync execution', async () => {
  const output = createOutput()
  const calls = []
  const exitCode = await runCli(['sync', 'push', '/local', 'remote:path'], output, {
    dependents: {
      async startSync(options) {
        calls.push(options)
        return { result: SYNC_RESULT.COMPLETED }
      },
    },
  })

  assert.equal(exitCode, 0)
  assert.deepEqual(calls, [
    {
      mode: 'push',
      localFolderPath: '/local',
      remoteFolderPath: 'remote:path',
      bypassConfig: false,
    },
  ])
})

test('runCli keeps legacy sync argument routing without explicit sync command', async () => {
  const output = createOutput()
  const calls = []
  const exitCode = await runCli(['pull', '/local', 'remote:path'], output, {
    dependents: {
      async startSync(options) {
        calls.push(options)
        return { result: SYNC_RESULT.COMPLETED }
      },
    },
  })

  assert.equal(exitCode, 0)
  assert.equal(calls[0].mode, 'pull')
})
