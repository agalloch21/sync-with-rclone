import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import { APP_ERROR_CODE, throwAppError } from '../../app-errors.js'
import { loadConfiguration } from '../../services/app-config.js'
import { resolveLocalDirectoryPath } from '../../services/local-path.js'
import { resolveSyncTask } from './resolve-task.js'

export async function resolveSyncContext(options, runtimePaths = getRuntimePaths()) {
  const { bypassConfig = false } = options
  if (bypassConfig && !options.remoteFolderPath) {
    throwAppError(
      APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED,
      'remoteFolderPath is required when bypassConfig is enabled',
    )
  }

  const config = bypassConfig ? null : await loadConfiguration(runtimePaths.configPath)
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
