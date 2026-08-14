import { normalizeRemoteFolderPath } from '#src/infrastructure/rclone/remote-path.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'
import { APP_ERROR_CODE, throwAppError } from '../../app-errors.js'
import { loadAppConfiguration } from '../../services/app-config.js'
import { resolveMapping, resolveSyncLocalFolderPath } from './resolve-mapping.js'

export async function resolveSyncContext(options, runtimePaths = getRuntimePaths()) {
  const { bypassConfig = false } = options
  if (bypassConfig && !options.remoteFolderPath) {
    throwAppError(
      APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED,
      'remoteFolderPath is required when bypassConfig is enabled',
    )
  }

  const config = bypassConfig ? null : await loadAppConfiguration(runtimePaths.configPath)
  const resolvedMapping = bypassConfig
    ? null
    : resolveMapping(config, options.localFolderPath, options.remoteFolderPath)

  let explicitRemoteFolderPath = ''
  if (!resolvedMapping) {
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
      localFolderPath: resolvedMapping
        ? resolvedMapping.localFolderPath
        : resolveSyncLocalFolderPath(options.localFolderPath),
      remoteFolderPath: resolvedMapping
        ? resolvedMapping.remoteFolderPath
        : explicitRemoteFolderPath,
      syncFilterPatterns: resolvedMapping ? resolvedMapping.syncFilterPatterns : [],
    },
    resolvedMapping,
    runtimePaths,
  }
}
