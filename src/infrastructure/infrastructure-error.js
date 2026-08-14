export const INFRASTRUCTURE_ERROR_CODE = Object.freeze({
  PATH_EMPTY: 'path.empty',
  PATH_NOT_FOUND: 'path.not_found',
  PATH_NOT_DIRECTORY: 'path.not_directory',
  PATH_SYMBOLIC_LINK_CONFLICT: 'path.symbolic_link_conflict',
  CONFIG_LOAD_FAILED: 'config.load_failed',
  CONFIG_UPDATE_FAILED: 'config.update_failed',
  CONFIG_UPDATE_IN_PROGRESS: 'config.update_in_progress',

  RCLONE_COMMAND_FAILED: 'rclone.command_failed',
  RCLONE_PARSE_FAILED: 'rclone.parse_failed',

  REMOTE_FOLDER_PATH_REQUIRED: 'remote.folder_path_required',
  REMOTE_FOLDER_NOT_FOUND: 'remote.folder_not_found',
  REMOTE_FOLDER_PROBE_FAILED: 'remote.folder_probe_failed',
  REMOTE_FOLDER_CREATE_FAILED: 'remote.folder_create_failed',
})

const infrastructureErrorCodes = new Set(Object.values(INFRASTRUCTURE_ERROR_CODE))

export class InfrastructureError extends Error {
  constructor(code, message, options = {}) {
    if (!infrastructureErrorCodes.has(code))
      throw new TypeError(`Unknown infrastructure error code: ${code}`)

    super(message, { cause: options.cause })
    this.name = 'InfrastructureError'
    this.code = code
    this.detail = options.detail
    this.meta = options.meta
  }
}

export function createInfrastructureError(code, message, options = {}) {
  return new InfrastructureError(code, message, options)
}

export function throwInfrastructureError(code, message, options = {}) {
  throw createInfrastructureError(code, message, options)
}
