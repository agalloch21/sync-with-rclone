/** @typedef {import('./contract.js').SyncPipelineOptions} SyncPipelineOptions */
/** @typedef {import('./contract.js').SyncPipelineResult} SyncPipelineResult */
/** @typedef {import('./contract.js').SyncPipelineRuntime} SyncPipelineRuntime */

import { buildSyncPlan } from '#src/domain/synchronization/build-sync-plan.js'
import { compareSnapshots } from '#src/domain/synchronization/compare-snapshots.js'
import { buildLocalSnapshot } from '#src/infrastructure/filesystem/build-local-snapshot.js'
import { applySyncPlan } from '#src/infrastructure/rclone/apply-sync-plan.js'
import { buildRemoteSnapshot } from '#src/infrastructure/rclone/build-remote-snapshot.js'
import { SYNC_CANCEL_REASON, SYNC_PHASES, SYNC_RESULT, SYNC_REVIEW_ACTION } from './contract.js'
import { createReporter, runWithReporter } from './phase-reporter.js'

function assertRuntimeContract(runtime) {
  if (!runtime || typeof runtime !== 'object')
    throw new TypeError('runSyncPipeline runtime must be an object')

  const eventListener = runtime.events?.eventListener
  if (eventListener && typeof eventListener !== 'function')
    throw new TypeError('runSyncPipeline runtime.events.eventListener must be a function')

  const reviewDiff = runtime.interactions?.reviewDiff
  if (reviewDiff && typeof reviewDiff !== 'function')
    throw new TypeError('runSyncPipeline runtime.interactions.reviewDiff must be a function')

  const dependents = runtime.dependents || {}
  if (dependents.runCommand && typeof dependents.runCommand !== 'function')
    throw new TypeError('runSyncPipeline runtime.dependents.runCommand must be a function')
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
 * Headless sync pipeline. UI review is injected from the outside.
 *
 * @export
 * @param {SyncPipelineOptions} options
 * @param {SyncPipelineRuntime} [runtime]
 * @param {AbortSignal | null} [cancelSignal]
 * @returns {Promise<SyncPipelineResult>}
 */
export async function runSyncPipeline(
  options,
  runtime = { events: { eventListener: null }, interactions: { reviewDiff: null }, dependents: {} },
  cancelSignal = null,
) {
  assertRuntimeContract(runtime)

  const emit = runtime.events?.eventListener || (() => {})
  const reporter = createReporter(emit)
  let currentPhase = null

  function runPhase(phase, fn, message) {
    currentPhase = phase
    return runWithReporter(reporter, phase, fn, message, cancelSignal)
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
      () => applySyncPlan(syncPlan, normalizedOptions, {
        dependents: runtime.dependents,
        events: {
          progress: progress => reporter.progress(SYNC_PHASES.APPLY_PLAN, progress),
        },
      }, cancelSignal),
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
