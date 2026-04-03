import { syncCore } from '#src/core/sync-engine.js'
import { applySyncPlan } from '#src/core/apply-sync-plan.js'
import { loadConfig } from './load-config.js'
import { getRuntimePaths } from './runtime-paths.js'
import { resolveSyncTask } from './resolve-sync-task.js'

/**
 * Application-layer orchestration entry.
 * Shells provide options and a review implementation.
 *
 * @param {import('#src/core/sync-engine.js').Options} options
 * @param {{
 *   reviewDiff?: (diffSnapshot: import('#src/types/snapshot.js').DiffSnapshot, context: unknown) => Promise<import('#src/app/review-contracts.js').ReviewResult | unknown>
 *   onApplyEvent?: (event: object) => Promise<void> | void
 * }} [hooks]
 */
export async function startSync(options, hooks = {}) {
  const runtimePaths = getRuntimePaths()
  const config = await loadConfig()
  const resolvedTask = resolveSyncTask(options.localFolderPath, config, options.remoteFolderPath)

  const resolvedOptions = resolvedTask
    ? {
        ...options,
        localFolderPath: options.localFolderPath,
        remoteFolderPath: resolvedTask.remoteFolderPath,
        extraIgnorePatterns: resolvedTask.extraIgnorePatterns,
        runtimePaths,
      }
    : {
        ...options,
        runtimePaths,
      }

  const result = await syncCore(resolvedOptions, hooks)
  const applyResult = await applySyncPlan(result.syncPlan, {
    mode: result.options.mode,
    localFolderPath: result.options.localFolderPath,
    remoteFolderPath: result.options.remoteFolderPath,
    runtimePaths,
  }, {
    onEvent: hooks.onApplyEvent,
  })

  return {
    ...result,
    applyResult,
    runtimePaths,
    config,
    resolvedTask,
  }
}
