/** @typedef {import('./contract.js').SyncExecutionOptions} SyncExecutionOptions */
/** @typedef {import('./contract.js').SyncExecutionResult} SyncExecutionResult */
/** @typedef {import('./contract.js').SyncExecutionRuntime} SyncExecutionRuntime */

import { SYNC_CANCEL_REASON, SYNC_PHASE_EVENT, SYNC_PHASES, SYNC_RESULT, SYNC_REVIEW_ACTION } from './contract.js'
import { buildSyncPlan } from './planning/build-sync-plan.js'
import { executeSyncPlan } from './planning/execute-sync-plan.js'
import {
  buildLocalSnapshot,
  buildRemoteSnapshot,
} from './snapshots/acquire-snapshots.js'
import { compareSnapshots } from './snapshots/compare-snapshots.js'

function assertRuntimeContract(runtime) {
  if (!runtime || typeof runtime !== 'object')
    throw new TypeError('executeSync runtime must be an object')

  const eventListener = runtime.events?.eventListener
  if (eventListener && typeof eventListener !== 'function')
    throw new TypeError('executeSync runtime.events.eventListener must be a function')

  const reviewDiff = runtime.interactions?.reviewDiff
  if (reviewDiff && typeof reviewDiff !== 'function')
    throw new TypeError('executeSync runtime.interactions.reviewDiff must be a function')
}

function createPhaseReporter(emit = () => {}) {
  return {
    started(phase, message) {
      emit({ type: SYNC_PHASE_EVENT.STARTED, phase, message: message || `phase [${phase}] started` })
    },
    done(phase, message) {
      emit({ type: SYNC_PHASE_EVENT.DONE, phase, message: message || `phase [${phase}] completed` })
    },
    progress(phase, progress) {
      emit({
        type: SYNC_PHASE_EVENT.PROGRESS,
        phase,
        message: `phase [${phase}] is running`,
        progress,
      })
    },
    error(phase, error) {
      emit({ type: SYNC_PHASE_EVENT.FAILED, phase, message: error?.message || `phase [${phase}] failed` })
    },
    cancelled(phase, message) {
      emit({ type: SYNC_PHASE_EVENT.CANCELLED, phase, message: message || `phase [${phase}] cancelled` })
    },
  }
}

async function runPhaseWithReporter(reporter, phase, fn, message, cancelSignal = null) {
  reporter.started(phase, message)

  try {
    const result = await fn()

    reporter.done(phase)

    cancelSignal?.throwIfAborted()

    return result
  }
  catch (error) {
    if (cancelSignal?.aborted || error === cancelSignal?.reason)
      reporter.cancelled(phase)
    else
      reporter.error(phase, error)

    throw error
  }
}

function normalizeOptions(options) {
  if (!options?.mode || (options.mode !== 'push' && options.mode !== 'pull'))
    throw new Error(`Invalid sync mode: ${options?.mode}`)

  if (!options.localFolderPath)
    throw new Error('localFolderPath is required')

  if (!options.remoteFolderPath)
    throw new Error('remoteFolderPath is required')

  return {
    mode: options.mode,
    localFolderPath: options.localFolderPath,
    remoteFolderPath: options.remoteFolderPath,
    extraIgnorePatterns: Array.isArray(options.extraIgnorePatterns) ? options.extraIgnorePatterns : [],
    runtimePaths: options.runtimePaths || undefined,
  }
}

function getDiffSummary(diffSnapshot) {
  return diffSnapshot?.summary || {
    added: 0,
    modified: 0,
    deleted: 0,
  }
}

/**
 * Executes a resolved synchronization. UI review is injected from the outside.
 *
 * @export
 * @param {SyncExecutionOptions} options
 * @param {SyncExecutionRuntime} [runtime]
 * @param {AbortSignal | null} [cancelSignal]
 * @returns {Promise<SyncExecutionResult>} Final result for the resolved synchronization.
 */
export async function executeSync(
  options,
  runtime = { events: { eventListener: null }, interactions: { reviewDiff: null } },
  cancelSignal = null,
) {
  assertRuntimeContract(runtime)

  const emit = runtime.events?.eventListener || (() => {})
  const reporter = createPhaseReporter(emit)
  let currentPhase = null

  function runPhase(phase, fn, message) {
    currentPhase = phase
    return runPhaseWithReporter(reporter, phase, fn, message, cancelSignal)
  }

  try {
    const normalizedOptions = await runPhase(
      SYNC_PHASES.PREPARATION,
      () => normalizeOptions(options),
      'normalize the options',
    )

    const localSnapshot = await runPhase(
      SYNC_PHASES.BUILD_LOCAL_SNAPSHOT,
      () => buildLocalSnapshot(
        normalizedOptions.localFolderPath,
        normalizedOptions.extraIgnorePatterns,
      ),
      'Building local snapshot',
    )

    const remoteSnapshot = await runPhase(
      SYNC_PHASES.BUILD_REMOTE_SNAPSHOT,
      () => buildRemoteSnapshot(
        normalizedOptions.remoteFolderPath,
        normalizedOptions.runtimePaths,
        cancelSignal,
      ),
      'Building remote snapshot',
    )

    const srcSnapshot = normalizedOptions.mode === 'push' ? localSnapshot : remoteSnapshot
    const dstSnapshot = normalizedOptions.mode === 'push' ? remoteSnapshot : localSnapshot
    const diffSnapshot = await runPhase(
      SYNC_PHASES.COMPARE_SNAPSHOT,
      () => compareSnapshots(srcSnapshot, dstSnapshot),
      'Comparing snapshots',
    )

    const reviewResult = runtime.interactions?.reviewDiff
      ? (await runPhase(
          SYNC_PHASES.REVIEW_DIFFERENCES,
          () => runtime.interactions?.reviewDiff(diffSnapshot),
          'Preparing differences review',
        ))
      : { action: SYNC_REVIEW_ACTION.CONFIRM }

    if (reviewResult.action === SYNC_REVIEW_ACTION.CANCEL) {
      return {
        result: SYNC_RESULT.CANCELLED,
        reason: SYNC_CANCEL_REASON.REVIEW_CANCELLED,
        phase: currentPhase,
        summary: getDiffSummary(diffSnapshot),
      }
    }

    const syncPlan = await runPhase(
      SYNC_PHASES.GENERATE_PLAN,
      () => buildSyncPlan(diffSnapshot, reviewResult),
      'Preparing operations',
    )

    const applyResult = await runPhase(
      SYNC_PHASES.APPLY_PLAN,
      () => executeSyncPlan(
        syncPlan,
        normalizedOptions,
        progress => reporter.progress(SYNC_PHASES.APPLY_PLAN, progress),
        cancelSignal,
      ),
      'Applying operations',
    )

    return {
      result: SYNC_RESULT.COMPLETED,
      summary: getDiffSummary(diffSnapshot),
      operations: applyResult.operations,
    }
  }
  catch (error) {
    if (cancelSignal?.aborted) {
      return {
        result: SYNC_RESULT.CANCELLED,
        reason: SYNC_CANCEL_REASON.ABORT_SIGNAL,
        phase: currentPhase,
        operations: error?.operations || [],
      }
    }

    return {
      result: SYNC_RESULT.FAILED,
      phase: currentPhase,
      message: error?.message || String(error),
      error,
      operations: error?.operations,
    }
  }
}
