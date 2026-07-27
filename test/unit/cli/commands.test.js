import assert from 'node:assert/strict'
import test from 'node:test'
import { runCli } from '#src/cli/commands.js'
import { SYNC_RESULT } from '#src/core/contract.js'
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

function createReportDisplay(states = []) {
  return {
    open(state) {
      states.push(state)
      return Promise.resolve('confirmed')
    },
    update(state) {
      states.push(state)
    },
    close() {},
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

test('runCli prints list-tasks through the app operations entrance', async () => {
  await withFakeAppRuntime({
    appConfig: {
      syncTasks: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/project',
        remoteBasePath: 'Projects',
        ignorePatterns: [],
      }],
    },
  }, async () => {
    const output = createOutput()
    const exitCode = await runCli(['list-tasks'], output)

    assert.equal(exitCode, 0)
    assert.match(output.lines[0], /LOCAL/)
    assert.match(output.lines[0], /synology/)
    assert.match(output.lines[0], /\/local\/project/)
  })
})

test('runCli adapts server mutation arguments and operation progress', async () => {
  const calls = []
  const states = []
  const runtime = {
    operationReportDisplay: createReportDisplay(states),
    operations: {
      async testServerConnection(name, onProgress) {
        calls.push(['test', name])
        onProgress('testConnection')
      },
      async createServer(name, protocol, fields, onProgress) {
        calls.push(['create', name, protocol, fields])
        onProgress('save')
      },
      async updateServer(name, expectedName, protocol, fields, onProgress) {
        calls.push(['update', name, expectedName, protocol, fields])
        onProgress('save')
      },
      async deleteServer(name, onProgress) {
        calls.push(['delete', name])
        onProgress('delete')
      },
    },
  }

  assert.equal(await runCli(['test-server', 'synology'], createOutput(), runtime), 0)
  assert.equal(await runCli([
    'create-server',
    'synology',
    'sftp',
    'host=nas.local',
    'pass=a=b',
  ], createOutput(), runtime), 0)
  assert.equal(await runCli([
    'update-server',
    'synology',
    'nas',
    'sftp',
    'host=next.local',
  ], createOutput(), runtime), 0)
  assert.equal(await runCli(['delete-server', 'nas'], createOutput(), runtime), 0)

  assert.deepEqual(calls, [
    ['test', 'synology'],
    ['create', 'synology', 'sftp', { host: 'nas.local', pass: 'a=b' }],
    ['update', 'synology', 'nas', 'sftp', { host: 'next.local' }],
    ['delete', 'nas'],
  ])
  assert.equal(states.some(state => state.key === 'operations.testServerConnection.succeeded'), true)
  assert.equal(states.some(state => state.key === 'operations.createServer.steps.save'), true)
  assert.equal(states.some(state => state.key === 'operations.updateServer.succeeded'), true)
  assert.equal(states.some(state => state.key === 'operations.deleteServer.succeeded'), true)
})

test('runCli adapts every sync-task mutation', async () => {
  const calls = []
  const runtime = {
    operationReportDisplay: createReportDisplay(),
    operations: {
      async createSyncTask(task) {
        calls.push(['create', task])
      },
      async updateSyncTask(task, expectedTask) {
        calls.push(['update', task, expectedTask])
      },
      async updateSyncTaskIgnorePatterns(task, patterns) {
        calls.push(['patterns', task, patterns])
      },
      async deleteSyncTask(task) {
        calls.push(['delete', task])
      },
    },
  }
  const output = createOutput()

  assert.equal(await runCli([
    'create-task',
    'synology',
    '/local/current',
    'Current',
  ], output, runtime), 0)
  assert.equal(await runCli([
    'update-task',
    'synology',
    '/local/current',
    'nas',
    '/local/next',
    'Next',
  ], output, runtime), 0)
  assert.equal(await runCli([
    'update-task-ignore-patterns',
    'nas',
    '/local/next',
    '.DS_Store',
    '*.tmp',
  ], output, runtime), 0)
  assert.equal(await runCli([
    'delete-task',
    'nas',
    '/local/next',
  ], output, runtime), 0)

  assert.deepEqual(calls, [
    ['create', {
      rcloneRemote: 'synology',
      localBasePath: '/local/current',
      remoteBasePath: 'Current',
    }],
    ['update', {
      rcloneRemote: 'synology',
      localBasePath: '/local/current',
    }, {
      rcloneRemote: 'nas',
      localBasePath: '/local/next',
      remoteBasePath: 'Next',
    }],
    ['patterns', {
      rcloneRemote: 'nas',
      localBasePath: '/local/next',
    }, ['.DS_Store', '*.tmp']],
    ['delete', {
      rcloneRemote: 'nas',
      localBasePath: '/local/next',
    }],
  ])
})

test('runCli adapts server and settings queries without operation acknowledgement', async () => {
  const calls = []
  const output = createOutput()
  const operations = {
    async getServer(name) {
      calls.push(['getServer', name])
      return { name, type: 'sftp', address: 'nas.local' }
    },
    async listGlobalIgnorePatterns() {
      calls.push(['listGlobalIgnorePatterns'])
      return ['.DS_Store', '*.tmp']
    },
    async getFolderTree(name, folderPath) {
      calls.push(['getFolderTree', name, folderPath])
      return {
        name,
        path: folderPath,
        children: [{
          name: 'Projects',
          path: 'Projects',
          children: null,
        }],
      }
    },
    async updateGlobalIgnorePatterns(patterns) {
      calls.push(['updateGlobalIgnorePatterns', patterns])
    },
  }

  assert.equal(await runCli(['get-server', 'synology'], output, { operations }), 0)
  assert.equal(await runCli(['list-server-folders', 'synology'], output, { operations }), 0)
  assert.equal(await runCli(['list-global-ignore-patterns'], output, { operations }), 0)
  assert.equal(await runCli([
    'update-global-ignore-patterns',
    '.DS_Store',
    '*.tmp',
  ], output, { operations }), 0)

  assert.deepEqual(calls, [
    ['getServer', 'synology'],
    ['getFolderTree', 'synology', ''],
    ['listGlobalIgnorePatterns'],
    ['updateGlobalIgnorePatterns', ['.DS_Store', '*.tmp']],
  ])
})

test('runCli reports invalid adapter arguments without invoking an operation', async () => {
  const output = createOutput()
  const exitCode = await runCli(['create-task', 'synology'], output, {
    operations: {},
  })

  assert.equal(exitCode, 1)
  assert.match(output.errors[0], /Usage: create-task/)
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
