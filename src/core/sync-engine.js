import { applySyncPlan } from './apply-sync-plan.js'
import { buildLocalSnapshot } from './build-local-snapshot.js'
import { buildRemoteSnapshot } from './build-remote-snapshot.js'
import { buildSyncPlan } from './build-sync-plan.js'
import { compareSnapshot } from './compare-snapshot.js'
import { PHASES } from './phases.js'
import { createReporter, runWithReporter } from './sync-reporter.js'

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

/**
 * Headless sync pipeline. UI review is injected from the outside.
 *
 * @export
 * @param {Options} options
 */
export async function syncCore(
  options,
  runtime = { events: { eventListener: null }, interactions: { reviewDiff: null }, dependents: {} },
  cancelSignal = null,
) {
  const emit = runtime.events?.eventListener || (() => {})
  const reporter = createReporter(emit)

  try {
    const normalizedOptions = await runWithReporter(
      reporter,
      PHASES.PREPARATION,
      () => normalizeOptions(options),
      'normalize the options',
      cancelSignal,
    )

    const localSnapshot = await runWithReporter(
      reporter,
      PHASES.BUILD_LOCAL_SNAPSHOT,
      () => buildLocalSnapshot(
        normalizedOptions.localFolderPath,
        normalizedOptions.extraIgnorePatterns,
      ),
      'Building local snapshot',
      cancelSignal,
    )

    const remoteSnapshot = await runWithReporter(
      reporter,
      PHASES.BUILD_REMOTE_SNAPSHOT,
      () => buildRemoteSnapshot(
        normalizedOptions.remoteFolderPath,
        normalizedOptions.runtimePaths,
        cancelSignal,
      ),
      'Building remote snapshot',
      cancelSignal,
    )

    const srcSnapshot = normalizedOptions.mode === 'push' ? localSnapshot : remoteSnapshot
    const dstSnapshot = normalizedOptions.mode === 'push' ? remoteSnapshot : localSnapshot
    const diffSnapshot = await runWithReporter(
      reporter,
      PHASES.COMPARE_SNAPSHOT,
      () => compareSnapshot(srcSnapshot, dstSnapshot),
      'Comparing snapshots',
      cancelSignal,
    )

    const reviewResult = runtime.interactions?.reviewDiff
      ? (await runWithReporter(
          reporter,
          PHASES.REVIEW_DIFFERENCES,
          () => runtime.interactions?.reviewDiff(diffSnapshot),
          'Preparing differences review',
          cancelSignal,
        ))
      : { action: 'confirm' }

    if (reviewResult.action === 'cancel') {
      return {
        result: 'cancelled',
        reason: 'review-cancelled',
        summary: diffSnapshot.dirEntries['.'].changes,
      }
    }

    const syncPlan = await runWithReporter(
      reporter,
      PHASES.GENERATE_PLAN,
      () => buildSyncPlan(diffSnapshot, reviewResult),
      'Preparing operations',
      cancelSignal,
    )

    const appliedResult = await runWithReporter(
      reporter,
      PHASES.APPLY_PLAN,
      () => applySyncPlan(syncPlan, normalizedOptions, {
        dependents: runtime.dependents,
        events: {
          progress: (current, total, message) => reporter.progress(PHASES.APPLY_PLAN, current, total, message),
        },
      }, cancelSignal),
      'Applying operations',
      cancelSignal,
    )

    return {
      result: 'completed',
      summary: diffSnapshot.dirEntries['.'].changes,
      // todo: 把operations里填入已经执行过的操作, syncPlan.operations里只是大phase
      operations: syncPlan.operations,
    }
  }
  catch (error) {
    if (cancelSignal?.aborted || error === cancelSignal?.reason) {
      return {
        result: 'cancelled',
        reason: 'abort-signal',
        // todo: 把operations里填入已经执行过的操作
        operations: [],
      }
    }

    throw error
  }
}
