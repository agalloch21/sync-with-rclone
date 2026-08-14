import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { AppError } from '#src/app/app-errors.js'
import { createSyncDiagnostics } from '#src/app/operations/sync/diagnostics.js'

async function createRuntimePaths() {
  return {
    logDirectory: await fs.mkdtemp(path.join(os.tmpdir(), 'sync-diagnostics-')),
  }
}

test('sync diagnostics can attach observed context, phase and activity to a technical failure', async () => {
  const runtimePaths = await createRuntimePaths()
  const diagnostics = createSyncDiagnostics(runtimePaths)

  await diagnostics.result({ result: 'completed' })
  await diagnostics.result({ result: 'cancelled', reason: 'review-cancelled' })
  await assert.rejects(
    () => fs.access(path.join(runtimePaths.logDirectory, 'diagnostics.log')),
    error => error?.code === 'ENOENT',
  )

  diagnostics.contextResolved({
    mode: 'pull',
    localFolderPath: '/resolved/project',
    remoteFolderPath: 'nas:remote/project',
  })
  diagnostics.phase({ type: 'sync.phase.started', phase: 'apply-plan' })
  diagnostics.phase({
    type: 'sync.phase.progress',
    phase: 'apply-plan',
    progress: { activity: 'copy' },
  })
  await diagnostics.result({
    result: 'failed',
    error: new AppError({
      code: 'sync.execution_failed',
      message: 'Synchronization failed.',
    }, { cause: new Error('copy failed') }),
  })

  const content = await fs.readFile(path.join(runtimePaths.logDirectory, 'diagnostics.log'), 'utf8')
  assert.match(content, /"localFolderPath": "\/resolved\/project"/)
  assert.match(content, /"failedPhase": "apply-plan"/)
  assert.match(content, /"failedActivity": "copy"/)
  assert.match(content, /copy failed/)
})

test('sync diagnostics does not record an expected admission overlap', async () => {
  const runtimePaths = await createRuntimePaths()
  const diagnostics = createSyncDiagnostics(runtimePaths)

  await diagnostics.result({
    result: 'failed',
    error: new AppError({
      code: 'sync_session.overlap',
      message: 'Another synchronization overlaps this path.',
    }),
  })

  await assert.rejects(
    () => fs.access(path.join(runtimePaths.logDirectory, 'diagnostics.log')),
    error => error?.code === 'ENOENT',
  )
})
