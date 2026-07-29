import { resolveLocalDirectoryPath } from '#src/infrastructure/filesystem/local-path.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import { loadAppConfig } from '../configuration/app-config.js'
import { resolveSyncTask } from './resolve-sync-task.js'

export async function resolveSyncContext(options, runtimePaths = getRuntimePaths()) {
  const { bypassConfig = false } = options
  if (bypassConfig && !options.remoteFolderPath)
    throw new Error('remoteFolderPath is required when bypassConfig is enabled')

  const config = bypassConfig ? null : await loadAppConfig(runtimePaths.configPath)
  const resolvedTask = bypassConfig
    ? null
    : resolveSyncTask(config, options.localFolderPath, options.remoteFolderPath)

  return {
    context: {
      mode: options.mode,
      localFolderPath: resolvedTask
        ? resolvedTask.localFolderPath
        : resolveLocalDirectoryPath(options.localFolderPath),
      remoteFolderPath: resolvedTask
        ? resolvedTask.remoteFolderPath
        : options.remoteFolderPath,
      extraIgnorePatterns: resolvedTask ? resolvedTask.extraIgnorePatterns : [],
    },
    resolvedTask,
    runtimePaths,
  }
}
