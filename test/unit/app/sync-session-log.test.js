import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import { AppError } from '#src/app/app-errors.js'
import { createSyncSessionLogger } from '#src/app/operations/sync/session-log.js'
import { InfrastructureError } from '#src/infrastructure/infrastructure-error.js'

const sessionLogModuleUrl = pathToFileURL(
  path.resolve('src/app/operations/sync/session-log.js'),
).href

async function createLogRuntime() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-session-log-'))
  return {
    directory,
    runtimePaths: {
      logDirectory: directory,
      configPath: path.join(directory, 'config.json'),
      rcloneConfigPath: path.join(directory, 'rclone.conf'),
      bundledRclonePath: path.join(directory, 'rclone'),
    },
  }
}

async function readRecords(directory) {
  const content = await fs.readFile(path.join(directory, 'sync-session.log'), 'utf8')
  return content.trim().split('\n').map(line => JSON.parse(line))
}

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => stderr += chunk)
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0)
        resolve()
      else
        reject(new Error(`Log worker exited with ${code}: ${stderr}`))
    })
  })
}

test('sync session log records lifecycle events and deduplicates apply activity', async () => {
  const { directory, runtimePaths } = await createLogRuntime()
  const logger = createSyncSessionLogger({
    mode: 'pull',
    localFolderPath: '/local/project',
    remoteFolderPath: 'nas:remote/project',
    bypassConfig: true,
  }, runtimePaths)

  await logger.started()
  await logger.contextResolved({
    mode: 'pull',
    localFolderPath: '/real/project',
    remoteFolderPath: 'nas:remote/project',
    extraIgnorePatterns: ['node_modules'],
  })
  await logger.phase({
    type: 'sync.phase.started',
    phase: 'apply-plan',
    message: 'Applying operations',
  })
  await logger.phase({
    type: 'sync.phase.progress',
    phase: 'apply-plan',
    progress: { activity: 'copy', index: 2, total: 6, measurement: { current: 1, total: 2 } },
  })
  await logger.phase({
    type: 'sync.phase.progress',
    phase: 'apply-plan',
    progress: { activity: 'copy', index: 2, total: 6, measurement: { current: 2, total: 2 } },
  })
  await logger.result({
    result: 'completed',
    summary: { added: 1, modified: 0, deleted: 0 },
    operations: [{ path: 'file.txt', synced: true }],
  })

  const records = await readRecords(directory)
  assert.deepEqual(records.map(record => record.event), [
    'session.started',
    'session.context-resolved',
    'sync.phase.started',
    'sync.phase.activity',
    'session.completed',
  ])
  assert.equal(new Set(records.map(record => record.sessionId)).size, 1)
  assert.equal(records[0].schemaVersion, 1)
  assert.equal(records[0].requestedContext.localFolderPath, '/local/project')
  assert.equal(records[1].context.localFolderPath, '/real/project')
  assert.equal(records[3].measurement, undefined)
  assert.deepEqual(records[4].operations, { total: 1, synced: 1, pending: 0 })
})

test('sync session failure log serializes, redacts, truncates, and bounds the cause chain', async () => {
  const { directory, runtimePaths } = await createLogRuntime()
  const nativeError = new Error('request failed for https://user:password@nas token=top-secret')
  nativeError.code = 3
  nativeError.stdout = `HEAD password=plain ${'x'.repeat(70 * 1024)} TAIL token=hidden`
  nativeError.stderr = '{"password":"json-secret","message":"directory not found"}'

  const infrastructureError = new InfrastructureError(
    'remote.folder_not_found',
    'Remote folder was not found.',
    {
      cause: nativeError,
      detail: 'directory not found',
      meta: {
        remotePath: 'nas:remote/missing',
        pass: 'meta-secret',
        accessToken: 'access-secret',
      },
    },
  )
  const appError = new AppError({
    code: 'sync.remote_source_not_found',
    message: 'The remote source folder does not exist.',
    meta: { remoteFolderPath: 'nas:remote/missing' },
  }, { cause: infrastructureError })
  nativeError.cause = appError

  const logger = createSyncSessionLogger({ mode: 'pull' }, runtimePaths)
  await logger.result({
    result: 'failed',
    error: appError,
    operations: [
      { type: 'copy', path: 'completed.txt', synced: true },
      { type: 'copy', path: 'failed.txt', synced: false },
    ],
  })

  const [record] = await readRecords(directory)
  assert.equal(record.event, 'session.failed')
  assert.equal(record.level, 'error')
  assert.equal(record.error.chain[0].code, 'sync.remote_source_not_found')
  assert.equal(record.error.chain[1].code, 'remote.folder_not_found')
  assert.equal(record.error.chain[1].meta.pass, '[REDACTED]')
  assert.equal(record.error.chain[1].meta.accessToken, '[REDACTED]')
  assert.deepEqual(record.operations, {
    total: 2,
    synced: 1,
    pending: 1,
    pendingPaths: ['failed.txt'],
    pendingPathsTruncated: false,
  })
  assert.equal(record.error.chain[2].stdout.truncated, true)
  assert.ok(record.error.chain[2].stdout.originalBytes > 64 * 1024)
  assert.ok(Buffer.byteLength(record.error.chain[2].stdout.content, 'utf8') <= 64 * 1024)
  assert.match(record.error.chain[2].stdout.content, /^HEAD password=\[REDACTED\]/)
  assert.match(record.error.chain[2].stdout.content, /TAIL token=\[REDACTED\]$/)
  assert.equal(record.error.chain.at(-1).name, 'CircularCause')

  const serialized = JSON.stringify(record)
  assert.equal(serialized.includes('top-secret'), false)
  assert.equal(serialized.includes('plain'), false)
  assert.equal(serialized.includes('hidden'), false)
  assert.equal(serialized.includes('json-secret'), false)
  assert.equal(serialized.includes('meta-secret'), false)
  assert.equal(serialized.includes('access-secret'), false)
  assert.equal(serialized.includes('user:password@'), false)
})

test('sync session log rotates at five MiB and keeps three backups', async () => {
  const { directory, runtimePaths } = await createLogRuntime()
  const logPath = path.join(directory, 'sync-session.log')
  await fs.writeFile(logPath, 'x'.repeat(5 * 1024 * 1024), 'utf8')
  await fs.writeFile(`${logPath}.1`, 'backup-one', 'utf8')
  await fs.writeFile(`${logPath}.2`, 'backup-two', 'utf8')
  await fs.writeFile(`${logPath}.3`, 'backup-three', 'utf8')

  const logger = createSyncSessionLogger({ mode: 'push' }, runtimePaths)
  await logger.started()

  assert.equal((await fs.stat(`${logPath}.1`)).size, 5 * 1024 * 1024)
  assert.equal(await fs.readFile(`${logPath}.2`, 'utf8'), 'backup-one')
  assert.equal(await fs.readFile(`${logPath}.3`, 'utf8'), 'backup-two')
  assert.equal((await readRecords(directory))[0].event, 'session.started')
})

test('sync session logging failure does not reject the caller', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-session-log-unwritable-'))
  const occupiedPath = path.join(directory, 'not-a-directory')
  await fs.writeFile(occupiedPath, 'occupied', 'utf8')

  t.mock.method(console, 'warn', () => {})
  const logger = createSyncSessionLogger({ mode: 'push' }, {
    logDirectory: occupiedPath,
  })

  await assert.doesNotReject(() => logger.started())
})

test('sync session logging ignores diagnostic values that cannot be serialized', async (t) => {
  const { runtimePaths } = await createLogRuntime()
  const meta = {}
  Object.defineProperty(meta, 'broken', {
    enumerable: true,
    get() {
      throw new Error('broken diagnostic getter')
    },
  })
  const error = new AppError({
    code: 'sync.execution_failed',
    message: 'Synchronization failed.',
    meta,
  })

  t.mock.method(console, 'warn', () => {})
  const logger = createSyncSessionLogger({ mode: 'push' }, runtimePaths)
  await assert.doesNotReject(() => logger.result({ result: 'failed', error }))
})

test('sync session logging ignores a mutex timeout', async (t) => {
  const { directory, runtimePaths } = await createLogRuntime()
  await fs.writeFile(
    path.join(directory, '.sync-session-log.lock'),
    JSON.stringify({
      pid: process.pid,
      token: 'active-test-owner',
      createdAt: new Date().toISOString(),
    }),
    'utf8',
  )

  const warnings = []
  t.mock.method(console, 'warn', message => warnings.push(message))
  const logger = createSyncSessionLogger({ mode: 'push' }, runtimePaths)

  await assert.doesNotReject(() => logger.started())
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /Timed out while waiting for file mutex/)
})

test('sync session log keeps concurrent process records as valid JSON lines', async () => {
  const { directory } = await createLogRuntime()
  const workerScript = `
    import { createSyncSessionLogger } from ${JSON.stringify(sessionLogModuleUrl)}
    const logger = createSyncSessionLogger({ mode: process.argv[1] }, {
      logDirectory: process.env.SYNC_SESSION_LOG_TEST_DIRECTORY,
    })
    await logger.started()
    await logger.result({ result: 'completed' })
  `
  const createWorker = mode => spawn(
    process.execPath,
    ['--input-type=module', '--eval', workerScript, mode],
    {
      env: {
        ...process.env,
        SYNC_SESSION_LOG_TEST_DIRECTORY: directory,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )

  const workers = [createWorker('push'), createWorker('pull')]
  await Promise.all(workers.map(waitForChild))

  const records = await readRecords(directory)
  assert.equal(records.length, 4)
  assert.equal(new Set(records.map(record => record.sessionId)).size, 2)
  for (const sessionId of new Set(records.map(record => record.sessionId))) {
    assert.deepEqual(
      records.filter(record => record.sessionId === sessionId).map(record => record.event),
      ['session.started', 'session.completed'],
    )
  }
})
