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
 * @param {import('#src/core/sync-engine.js').Options & { ignoreConfig?: boolean }} options
 * @param {{
 *   reviewDiff?: (diffSnapshot: import('#src/types/snapshot.js').DiffSnapshot, context: unknown) => Promise<import('#src/app/review-contracts.js').ReviewResult | unknown>
 *   onApplyEvent?: (event: object) => Promise<void> | void
 * }} [hooks]
 */
export async function startSync(options, hooks = {}) {
  const { ignoreConfig = false } = options
  const runtimePaths = getRuntimePaths()
  const config = ignoreConfig ? null : await loadConfig(runtimePaths.configPath)
  const localFolderPath = resolveLocalDirectoryPath(options.localFolderPath)
  const resolvedTask = ignoreConfig ? null : resolveSyncTask(localFolderPath, config, options.remoteFolderPath)

  if (ignoreConfig && !options.remoteFolderPath) {
    throw new Error('remoteFolderPath is required when ignoreConfig is enabled')
  }

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
        remoteFolderPath: options.remoteFolderPath,
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
