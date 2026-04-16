import { applySyncPlan } from './apply-sync-plan.js'
import { buildLocalSnapshot } from './build-local-snapshot.js'
import { buildRemoteSnapshot } from './build-remote-snapshot.js'
import { buildSyncPlan } from './build-sync-plan.js'
import { compareSnapshot } from './compare-snapshot.js'
import { PHASES } from './phases.js'
import { createReporter, runWithReporter } from './sync-reporter.js'

/**
 * @typedef {object} Options
 * @property {'push' | 'pull'} mode
 * @property {string} localFolderPath
 * @property {string} remoteFolderPath
 * @property {string[]} [extraIgnorePatterns]
 * @property {object} [runtimePaths]
 */

/**
 * @typedef {object} Hooks
 * @property {(diffSnapshot: import('#src/types/snapshot.js').DiffSnapshot, context: SyncContext) => Promise<unknown>} [reviewDiff]
 */

/**
 * @typedef {object} SyncContext
 * @property {Options} options
 * @property {import('#src/types/snapshot.js').Snapshot} localSnapshot
 * @property {import('#src/types/snapshot.js').Snapshot} remoteSnapshot
 * @property {import('#src/types/snapshot.js').Snapshot} srcSnapshot
 * @property {import('#src/types/snapshot.js').Snapshot} destSnapshot
 */

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
 * @param {Hooks} [hooks]
 */
export async function syncCore(options, hooks = {}) {
  const reporter = createReporter(hooks.onEvent || (() => {}))

  const normalizedOptions = await runWithReporter(reporter, PHASES.PREPARATION, () => normalizeOptions(options), 'Normalizing options')

  const localSnapshot = await runWithReporter(
    reporter,
    PHASES.BUILD_LOCAL_SNAPSHOT,
    () => buildLocalSnapshot(
      normalizedOptions.localFolderPath,
      normalizedOptions.extraIgnorePatterns,
    ),
    'Building local snapshot',
  )

  const remoteSnapshot = await runWithReporter(
    reporter,
    PHASES.BUILD_REMOTE_SNAPSHOT,
    () => buildRemoteSnapshot(
      normalizedOptions.remoteFolderPath,
      normalizedOptions.runtimePaths,
    ),
    'Building remote snapshot',
  )

  const srcSnapshot = normalizedOptions.mode === 'push' ? localSnapshot : remoteSnapshot
  const dstSnapshot = normalizedOptions.mode === 'push' ? remoteSnapshot : localSnapshot
  const diffSnapshot = await runWithReporter(
    reporter,
    PHASES.COMPARE_SNAPSHOT,
    () => compareSnapshot(srcSnapshot, dstSnapshot),
    'Comparing snapshots',
  )

  const reviewResult = hooks.reviewPortal
    ? (await runWithReporter(
        reporter,
        PHASES.REVIEW_DIFFERENCES,
        () => hooks.reviewPortal(diffSnapshot),
        'Preparing differences review',
      ))
    : { action: 'confirm' }

  const syncPlan = await runWithReporter(
    reporter,
    PHASES.GENERATE_PLAN,
    () => buildSyncPlan(diffSnapshot, reviewResult),
    'Preparing operations',
  )

  const appliedResult = await runWithReporter(
    reporter,
    PHASES.APPLY_PLAN,
    () => applySyncPlan(syncPlan, normalizedOptions, hooks.onProgress),
    'Applying operations',
  )

  return {
    diffSnapshot,
    reviewResult,
    syncPlan,
    appliedResult,
  }
}
