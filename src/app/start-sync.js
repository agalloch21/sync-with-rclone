import { applySyncPlan } from '#src/core/apply-sync-plan.js'
import { syncCore } from '#src/core/sync-engine.js'
import { loadConfig } from './load-config.js'
import { resolveLocalDirectoryPath } from './path-utils.js'
import { resolveSyncTask } from './resolve-sync-task.js'
import { getRuntimePaths } from './runtime-paths.js'

export async function startSync(options, hooks = {}) {
  const { bypassConfig = false } = options
  const runtimePaths = getRuntimePaths()
  const config = bypassConfig ? null : await loadConfig(runtimePaths.configPath)
  const localFolderPath = resolveLocalDirectoryPath(options.localFolderPath)
  const resolvedTask = bypassConfig ? null : resolveSyncTask(localFolderPath, config, options.remoteFolderPath)

  if (bypassConfig && !options.remoteFolderPath) {
    throw new Error('remoteFolderPath is required when bypassConfig is enabled')
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

  hooks.onOptionsResolved(resolvedOptions)

  const result = await syncCore(resolvedOptions, hooks)
  // const applyResult = await applySyncPlan(result.syncPlan, result.options, {
  //   onEvent: hooks.onApplyEvent,
  // })

  return {
    ...result,
    runtimePaths,
    config,
    resolvedTask,
  }
}
