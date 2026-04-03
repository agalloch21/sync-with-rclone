import { buildLocalSnapshot } from './build-local-snapshot.js'
import { buildRemoteSnapshot } from './build-remote-snapshot.js'
import { buildSyncPlan } from './build-sync-plan.js'
import { compareSnapshot } from './compare-snapshot.js'

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

function collectAllChangedPaths(diffSnapshot) {
  const paths = []

  for (const entryPath of diffSnapshot.dirEntries.keys()) {
    if (entryPath !== '.')
      paths.push(entryPath)
  }

  for (const entryPath of diffSnapshot.fileEntries.keys())
    paths.push(entryPath)

  return paths
}

async function acceptDiffByDefault(diffSnapshot) {
  return {
    action: 'confirm',
    selectedPaths: collectAllChangedPaths(diffSnapshot),
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
  const normalizedOptions = normalizeOptions(options)
  const localSnapshot = await buildLocalSnapshot(
    normalizedOptions.localFolderPath,
    true,
    normalizedOptions.extraIgnorePatterns,
  )
  const remoteSnapshot = await buildRemoteSnapshot(normalizedOptions.remoteFolderPath, {
    runtimePaths: normalizedOptions.runtimePaths,
  })

  const srcSnapshot = normalizedOptions.mode === 'push' ? localSnapshot : remoteSnapshot
  const destSnapshot = normalizedOptions.mode === 'push' ? remoteSnapshot : localSnapshot
  const diffSnapshot = compareSnapshot(srcSnapshot, destSnapshot)

  const context = {
    options: normalizedOptions,
    localSnapshot,
    remoteSnapshot,
    srcSnapshot,
    destSnapshot,
  }

  const reviewDiff = hooks.reviewDiff || acceptDiffByDefault
  const reviewResult = await reviewDiff(diffSnapshot, context)
  const syncPlan = buildSyncPlan(diffSnapshot, reviewResult)

  return {
    ...context,
    diffSnapshot,
    reviewResult,
    syncPlan,
  }
}
