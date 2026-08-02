export const APP_ERROR_CODE = Object.freeze({
  UNKNOWN: 'unknown',

  PATH_INVALID: 'path.invalid',

  CONFIG_LOAD_FAILED: 'config.load_failed',
  CONFIG_UPDATE_FAILED: 'config.update_failed',
  CONFIG_NO_MATCHING_SYNC_TASK: 'config.no_matching_sync_task',
  CONFIG_REMOTE_PATH_OUTSIDE_TASK: 'config.remote_path_outside_task',

  SYNC_TASK_ALREADY_EXISTS: 'sync_task.already_exists',
  SYNC_TASK_NOT_FOUND: 'sync_task.not_found',
  SYNC_SESSION_OVERLAP: 'sync_session.overlap',
  SYNC_EXECUTION_FAILED: 'sync.execution_failed',

  REMOTE_FOLDER_PATH_REQUIRED: 'remote.folder_path_required',
  REMOTE_FOLDER_PATH_INVALID: 'remote.folder_path_invalid',

  IPC_INVALID_PAYLOAD: 'ipc.invalid_payload',
  IPC_UNAVAILABLE: 'ipc.unavailable',

  SERVER_VALIDATION_FAILED: 'server.validation_failed',
  SERVER_ALREADY_EXISTS: 'server.already_exists',
  SERVER_NOT_FOUND: 'server.not_found',
  SERVER_CONNECTION_FAILED: 'server.connection_failed',
  SERVER_OPERATION_FAILED: 'server.operation_failed',
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

export function createAppError(code, message, options = {}) {
  const cause = options.cause
  const meta = Object.fromEntries(
    Object.entries({ ...cause?.meta, ...options.meta })
      .filter(([, value]) => value !== undefined),
  )

  return new AppError({
    code,
    message,
    detail: options.detail ?? cause?.detail,
    fields: options.fields ?? cause?.fields,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  }, {
    cause,
  })
}

export function throwAppError(code, message, options = {}) {
  throw createAppError(code, message, options)
}

export function toAppError(error, code, message, options = {}) {
  if (error instanceof AppError)
    return error

  return createAppError(code, message, {
    ...options,
    cause: error,
  })
}

export function getErrorCode(error) {
  return error?.code || APP_ERROR_CODE.UNKNOWN
}

export function getErrorDetail(error) {
  return error?.detail || ''
}
