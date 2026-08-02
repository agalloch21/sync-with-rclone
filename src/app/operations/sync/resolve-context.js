import { normalizeRemoteFolderPath } from '#src/infrastructure/rclone/remote-path.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import { APP_ERROR_CODE, throwAppError } from '../../app-errors.js'
import { loadConfiguration } from '../../services/app-config.js'
import { resolveSyncLocalFolderPath, resolveSyncTask } from './resolve-task.js'

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

  let explicitRemoteFolderPath = ''
  if (!resolvedTask) {
    try {
      explicitRemoteFolderPath = normalizeRemoteFolderPath(options.remoteFolderPath)
    }
    catch (error) {
      throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_INVALID, 'Invalid remote folder path.', {
        cause: error,
        meta: { remoteFolderPath: options.remoteFolderPath },
      })
    }
  }

  return {
    context: {
      mode: options.mode,
      localFolderPath: resolvedTask
        ? resolvedTask.localFolderPath
        : resolveSyncLocalFolderPath(options.localFolderPath),
      remoteFolderPath: resolvedTask
        ? resolvedTask.remoteFolderPath
        : explicitRemoteFolderPath,
      extraIgnorePatterns: resolvedTask ? resolvedTask.extraIgnorePatterns : [],
    },
    resolvedTask,
    runtimePaths,
  }
}
