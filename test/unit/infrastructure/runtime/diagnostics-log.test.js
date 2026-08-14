import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import { AppError } from '#src/app/app-errors.js'
import { InfrastructureError } from '#src/infrastructure/infrastructure-error.js'
import { writeDiagnostic } from '#src/infrastructure/runtime/diagnostics-log.js'

const diagnosticsModuleUrl = pathToFileURL(
  path.resolve('src/infrastructure/runtime/diagnostics-log.js'),
).href

async function createLogRuntime() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'diagnostics-log-'))
  return {
    directory,
    runtimePaths: { logDirectory: directory },
  }
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
        reject(new Error(`Diagnostics worker exited with ${code}: ${stderr}`))
    })
  })
}

test('diagnostics log writes readable, redacted failure details without identifiers', async () => {
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
  }, { cause: infrastructureError })
  nativeError.cause = appError

  await writeDiagnostic({
    source: 'sync',
    context: {
      mode: 'pull',
      remoteFolderPath: 'nas:remote/missing',
      failedPhase: 'build-remote-snapshot',
    },
    error: appError,
  }, runtimePaths)

  const content = await fs.readFile(path.join(directory, 'diagnostics.log'), 'utf8')
  assert.match(content, /ERROR sync/)
  assert.match(content, /"failedPhase": "build-remote-snapshot"/)
  assert.match(content, /AppError \(sync\.remote_source_not_found\)/)
  assert.match(content, /InfrastructureError \(remote\.folder_not_found\)/)
  assert.match(content, /stdout \(\d+ bytes, truncated to 65536 bytes\)/)
  assert.match(content, /HEAD password=\[REDACTED\]/)
  assert.match(content, /TAIL token=\[REDACTED\]/)
  assert.match(content, /CircularCause/)
  assert.doesNotMatch(content, /sessionId|operationId/)
  assert.doesNotMatch(content, /top-secret|plain|hidden|json-secret|meta-secret|access-secret|user:password@/)
})

test('diagnostics log resets the single file at one MiB without creating backups', async () => {
  const { directory, runtimePaths } = await createLogRuntime()
  const logPath = path.join(directory, 'diagnostics.log')
  await fs.writeFile(logPath, `old-entry-${'x'.repeat(1024 * 1024)}`, 'utf8')

  await writeDiagnostic({
    source: 'sync',
    message: 'new diagnostic',
    error: new Error('new failure'),
  }, runtimePaths)

  const content = await fs.readFile(logPath, 'utf8')
  assert.doesNotMatch(content, /old-entry/)
  assert.match(content, /new diagnostic/)
  assert.match(content, /new failure/)
  await assert.rejects(() => fs.access(`${logPath}.1`), error => error?.code === 'ENOENT')
})

test('diagnostics logging failures never reject the caller', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'diagnostics-log-unwritable-'))
  const occupiedPath = path.join(directory, 'not-a-directory')
  await fs.writeFile(occupiedPath, 'occupied', 'utf8')

  t.mock.method(console, 'warn', () => {})
  await assert.doesNotReject(() => writeDiagnostic({
    source: 'sync',
    error: new Error('failure'),
  }, { logDirectory: occupiedPath }))
})

test('diagnostics logging ignores values that cannot be serialized', async (t) => {
  const { runtimePaths } = await createLogRuntime()
  const context = {}
  Object.defineProperty(context, 'broken', {
    enumerable: true,
    get() {
      throw new Error('broken diagnostic getter')
    },
  })

  t.mock.method(console, 'warn', () => {})
  await assert.doesNotReject(() => writeDiagnostic({
    source: 'sync',
    context,
    error: new Error('failure'),
  }, runtimePaths))
})

test('diagnostics logging ignores a mutex timeout', async (t) => {
  const { directory, runtimePaths } = await createLogRuntime()
  await fs.writeFile(
    path.join(directory, '.diagnostics-log.lock'),
    JSON.stringify({
      pid: process.pid,
      token: 'active-test-owner',
      createdAt: new Date().toISOString(),
    }),
    'utf8',
  )

  const warnings = []
  t.mock.method(console, 'warn', message => warnings.push(message))
  await assert.doesNotReject(() => writeDiagnostic({
    source: 'sync',
    error: new Error('failure'),
  }, runtimePaths))
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /Timed out while waiting for file mutex/)
})

test('diagnostics log keeps concurrent process blocks intact', async () => {
  const { directory } = await createLogRuntime()
  const workerScript = `
    import { writeDiagnostic } from ${JSON.stringify(diagnosticsModuleUrl)}
    await writeDiagnostic({
      source: process.argv[1],
      error: new Error(process.argv[1] + ' failed'),
    }, {
      logDirectory: process.env.DIAGNOSTICS_LOG_TEST_DIRECTORY,
    })
  `
  const createWorker = source => spawn(
    process.execPath,
    ['--input-type=module', '--eval', workerScript, source],
    {
      env: {
        ...process.env,
        DIAGNOSTICS_LOG_TEST_DIRECTORY: directory,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )

  await Promise.all([
    waitForChild(createWorker('worker-one')),
    waitForChild(createWorker('worker-two')),
  ])

  const content = await fs.readFile(path.join(directory, 'diagnostics.log'), 'utf8')
  assert.equal(content.match(/^={80}$/gm)?.length, 4)
  assert.equal(content.match(/ERROR worker-one/g)?.length, 1)
  assert.equal(content.match(/ERROR worker-two/g)?.length, 1)
})
