import { syncCore } from '#src/core/sync-engine.js'
import { loadConfig } from './load-config.js'
import { resolveSyncTask } from './resolve-sync-task.js'

/**
 * Application-layer orchestration entry.
 * Shells provide options and a review implementation.
 *
 * @param {import('#src/core/sync-engine.js').Options} options
 * @param {{ reviewDiff?: (diffSnapshot: import('#src/types/snapshot.js').DiffSnapshot, context: unknown) => Promise<import('#src/app/review-contracts.js').ReviewResult | unknown> }} [hooks]
 */
export async function startSync(options, hooks = {}) {
  const config = await loadConfig()
  const resolvedTask = resolveSyncTask(options.localFolderPath, config, options.remoteFolderPath)

  const resolvedOptions = resolvedTask
    ? {
        ...options,
        localFolderPath: options.localFolderPath,
        remoteFolderPath: resolvedTask.remoteFolderPath,
        extraIgnorePatterns: resolvedTask.extraIgnorePatterns,
      }
    : options

  const result = await syncCore(resolvedOptions, hooks)

  return {
    ...result,
    config,
    resolvedTask,
  }
}
