import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import {
  acquireSyncAdmission,
  releaseSyncAdmission,
  syncAdmissionsOverlap,
} from '#src/app/operations/sync/admission.js'

const admissionModuleUrl = pathToFileURL(path.resolve('src/app/operations/sync/admission.js')).href

function descriptor(localFolderPath, remoteFolderPath) {
  return { localFolderPath, remoteFolderPath }
}

async function createRuntimePaths() {
  return {
    syncAdmissionDirectory: await fs.mkdtemp(path.join(os.tmpdir(), 'sync-admission-')),
  }
}

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => stderr += chunk)
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      if (stdout.includes('ready\n'))
        resolve()
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (!stdout.includes('ready\n'))
        reject(new Error(`Admission worker exited with ${code}: ${stderr}`))
    })
  })
}

test('sync admission detects exact and nested local or remote folders', () => {
  assert.equal(syncAdmissionsOverlap(
    descriptor('/projects/a', 'nas:remote/a'),
    descriptor('/projects/a/child', 'backup:remote/b'),
  ), true)
  assert.equal(syncAdmissionsOverlap(
    descriptor('C:\\Projects\\A', 'nas:remote/a'),
    descriptor('c:/projects/a/child', 'backup:remote/b'),
    'win32',
  ), true)
  assert.equal(syncAdmissionsOverlap(
    descriptor('/projects/a', 'nas:remote/a'),
    descriptor('/projects/b', 'nas:remote/a/child'),
  ), true)
  assert.equal(syncAdmissionsOverlap(
    descriptor('/projects/a', 'nas:remote/a'),
    descriptor('/projects/ab', 'backup:remote/a'),
  ), false)
})

test('sync admission allows non-overlapping work and releases its lease', async () => {
  const runtimePaths = await createRuntimePaths()
  const firstContext = descriptor('/local/a', 'nas:remote/a')
  const secondContext = descriptor('/local/b', 'nas:remote/b')

  const first = await acquireSyncAdmission(firstContext, runtimePaths)
  const second = await acquireSyncAdmission(secondContext, runtimePaths)
  await releaseSyncAdmission(first, runtimePaths)
  await releaseSyncAdmission(second, runtimePaths)

  const reacquired = await acquireSyncAdmission(firstContext, runtimePaths)
  await releaseSyncAdmission(reacquired, runtimePaths)
})

test('sync admission atomically admits only one of two overlapping requests', async () => {
  const runtimePaths = await createRuntimePaths()
  const context = descriptor('/local/project', 'nas:remote/project')
  const results = await Promise.allSettled([
    acquireSyncAdmission(context, runtimePaths),
    acquireSyncAdmission(context, runtimePaths),
  ])

  const admitted = results.filter(result => result.status === 'fulfilled')
  const rejected = results.filter(result => result.status === 'rejected')
  assert.equal(admitted.length, 1)
  assert.equal(rejected.length, 1)
  assert.equal(rejected[0].reason.code, APP_ERROR_CODE.SYNC_SESSION_OVERLAP)

  await releaseSyncAdmission(admitted[0].value, runtimePaths)
})

test('sync admission removes a lease whose owner process has ended', async () => {
  const runtimePaths = await createRuntimePaths()
  const leaseDirectory = path.join(runtimePaths.syncAdmissionDirectory, 'leases')
  const abandonedLeasePath = path.join(leaseDirectory, 'abandoned.json')
  await fs.mkdir(leaseDirectory, { recursive: true })
  await fs.writeFile(abandonedLeasePath, JSON.stringify({
    schemaVersion: 1,
    id: 'abandoned',
    pid: 2147483647,
    localFolderPath: '/local/project',
    remoteFolderPath: 'nas:remote/project',
    startedAt: new Date().toISOString(),
  }))

  const admission = await acquireSyncAdmission(
    descriptor('/local/project', 'nas:remote/project'),
    runtimePaths,
  )
  await releaseSyncAdmission(admission, runtimePaths)

  await assert.rejects(
    () => fs.access(abandonedLeasePath),
    error => error.code === 'ENOENT',
  )
})

test('sync admission rejects overlap held by another process and recovers after release', async (t) => {
  const runtimePaths = await createRuntimePaths()
  const workerScript = `
    import { acquireSyncAdmission, releaseSyncAdmission } from ${JSON.stringify(admissionModuleUrl)}
    const runtimePaths = { syncAdmissionDirectory: process.env.SYNC_ADMISSION_TEST_DIRECTORY }
    const admission = await acquireSyncAdmission({
      localFolderPath: '/local/project',
      remoteFolderPath: 'nas:remote/project',
    }, runtimePaths)
    process.stdout.write('ready\\n')
    process.stdin.once('data', async () => {
      await releaseSyncAdmission(admission, runtimePaths)
      process.exit(0)
    })
    process.stdin.resume()
  `
  const child = spawn(process.execPath, ['--input-type=module', '--eval', workerScript], {
    env: {
      ...process.env,
      SYNC_ADMISSION_TEST_DIRECTORY: runtimePaths.syncAdmissionDirectory,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  t.after(() => {
    if (child.exitCode === null)
      child.kill()
  })

  await waitForReady(child)

  await assert.rejects(
    () => acquireSyncAdmission(
      descriptor('/local/project/child', 'backup:other'),
      runtimePaths,
    ),
    error => error.code === APP_ERROR_CODE.SYNC_SESSION_OVERLAP,
  )

  const nonOverlapping = await acquireSyncAdmission(
    descriptor('/local/other', 'nas:remote/other'),
    runtimePaths,
  )
  await releaseSyncAdmission(nonOverlapping, runtimePaths)

  const exited = new Promise(resolve => child.once('exit', resolve))
  child.stdin.write('release\n')
  assert.equal(await exited, 0)

  const reacquired = await acquireSyncAdmission(
    descriptor('/local/project', 'nas:remote/project'),
    runtimePaths,
  )
  await releaseSyncAdmission(reacquired, runtimePaths)
})
