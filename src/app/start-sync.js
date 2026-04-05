import { syncCore } from '#src/core/sync-engine.js'
import { applySyncPlan } from '#src/core/apply-sync-plan.js'
import { loadConfig } from './load-config.js'
import { resolveLocalDirectoryPath } from './path-utils.js'
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
  const config = await loadConfig(runtimePaths.configPath)
  const localFolderPath = resolveLocalDirectoryPath(options.localFolderPath)
  const resolvedTask = resolveSyncTask(localFolderPath, config, options.remoteFolderPath)

  const resolvedOptions = resolvedTask
    ? {
        ...options,
        localFolderPath,
        remoteFolderPath: resolvedTask.remoteFolderPath,
        extraIgnorePatterns: resolvedTask.extraIgnorePatterns,
        runtimePaths,
      }
    : {
        ...options,
        localFolderPath,
        runtimePaths,
      }

  const result = await syncCore(resolvedOptions, hooks)
  const applyResult = await applySyncPlan(result.syncPlan, result.options, {
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
