export const APP_ERROR_CODE = Object.freeze({
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

  IPC_INVALID_PAYLOAD: 'ipc.invalid_payload',

  SERVER_INVALID_OPERATION: 'server.invalid_operation',
  SERVER_VALIDATION_FAILED: 'server.validation_failed',
  SERVER_OPERATION_FAILED: 'server.operation_failed',

  RCLONE_UNSUPPORTED_PROTOCOL: 'rclone.unsupported_protocol',
  RCLONE_INVALID_OPERATION: 'rclone.invalid_operation',
  RCLONE_OPERATION_FAILED: 'rclone.operation_failed',

})

export class AppError extends Error {
  constructor(errorInfo, options = {}) {
    super(errorInfo.message, { cause: options.cause })
    this.name = 'AppError'
    this.code = errorInfo.code
    this.detail = errorInfo.detail
    this.fields = errorInfo.fields
    this.meta = errorInfo.meta
  }
}

export function throwAppError(code, message, options = {}) {
  throw new AppError({
    code,
    message,
    detail: options.detail,
    fields: options.fields,
    meta: options.meta,
  }, {
    cause: options.cause,
  })
}

export function getErrorCode(error) {
  return error?.code || APP_ERROR_CODE.UNKNOWN
}

export function getErrorDetail(error) {
  return error?.detail || ''
}
