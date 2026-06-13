export const APP_ERROR_CODE = {
  UNKNOWN: 'unknown',
  PATH_EMPTY: 'path.empty',
  PATH_NOT_FOUND: 'path.not_found',
  PATH_NOT_DIRECTORY: 'path.not_directory',
  CONFIG_LOAD_FAILED: 'config.load_failed',
  CONFIG_NO_MATCHING_SYNC_TASK: 'config.no_matching_sync_task',
  CONFIG_REMOTE_PATH_OUTSIDE_TASK: 'config.remote_path_outside_task',
  REMOTE_FOLDER_PATH_REQUIRED: 'remote.folder_path_required',
  REMOTE_FOLDER_PROBE_FAILED: 'remote.folder_probe_failed',
  REMOTE_FOLDER_CREATE_FAILED: 'remote.folder_create_failed',
}

export class AppError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

export function getErrorCode(error) {
  return error?.code || APP_ERROR_CODE.UNKNOWN
}

export function getErrorDetails(error) {
  return error?.details || {}
}
