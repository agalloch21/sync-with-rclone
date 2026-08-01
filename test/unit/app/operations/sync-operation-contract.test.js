import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SYNC_SESSION_EVENT,
} from '#src/app/contracts/sync.js'
import { SYNC_PHASE_EVENT } from '#src/core/contract.js'

test('sync phase event names use the sync.phase namespace', () => {
  assert.deepEqual(SYNC_PHASE_EVENT, {
    STARTED: 'sync.phase.started',
    PROGRESS: 'sync.phase.progress',
    DONE: 'sync.phase.done',
    FAILED: 'sync.phase.failed',
    CANCELLED: 'sync.phase.cancelled',
  })
})

test('sync session event names use the sync.session namespace', () => {
  assert.deepEqual(SYNC_SESSION_EVENT, {
    STARTED: 'sync.session.started',
    CONTEXT_RESOLVED: 'sync.session.context-resolved',
    PROGRESS: 'sync.session.progress',
    RESULT: 'sync.session.result',
  })
})
