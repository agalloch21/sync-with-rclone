import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { defineLocaleTree } from '../../locale-tree.js'

export default {
  errors: defineLocaleTree({
    [APP_ERROR_CODE.UNKNOWN]: 'An unknown error occurred.',
    [APP_ERROR_CODE.PATH_EMPTY]: 'Path cannot be empty.',
    [APP_ERROR_CODE.PATH_NOT_FOUND]: 'Path does not exist: {path}',
    [APP_ERROR_CODE.PATH_NOT_DIRECTORY]: 'Expected a directory path, got: {path}',
    [APP_ERROR_CODE.CONFIG_LOAD_FAILED]: 'Failed to load sync configuration: {configPath}',
    [APP_ERROR_CODE.CONFIG_UPDATE_IN_PROGRESS]: 'Another configuration update is already in progress.',
    [APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK]: 'No sync task matches local path: {path}',
    [APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK]: 'Remote path must stay within sync task "{syncTaskName}": {remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED]: 'Remote folder path is required.',
    [APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED]: 'Failed to check remote folder: {remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED]: 'Failed to create remote folder: {remotePath}',
    [APP_ERROR_CODE.IPC_INVALID_PAYLOAD]: 'The application received an invalid request.',
    [APP_ERROR_CODE.IPC_UNAVAILABLE]: 'The application could not complete the request.',
    [APP_ERROR_CODE.RCLONE_UNSUPPORTED_PROTOCOL]: 'The selected server protocol is not supported.',
    [APP_ERROR_CODE.RCLONE_INVALID_OPERATION]: 'Invalid rclone operation.',
    [APP_ERROR_CODE.RCLONE_INVALID_REMOTE]: 'The rclone remote configuration is invalid.',
    [APP_ERROR_CODE.RCLONE_REMOTE_EXISTS]: 'The rclone remote already exists.',
    [APP_ERROR_CODE.RCLONE_REMOTE_MISSING]: 'The rclone remote does not exist.',
    [APP_ERROR_CODE.RCLONE_COMMAND_FAILED]: 'The rclone command failed.',
    [APP_ERROR_CODE.RCLONE_PARSE_FAILED]: 'Failed to parse the rclone response.',
    [APP_ERROR_CODE.RCLONE_OPERATION_FAILED]: 'The rclone operation failed.',
  }),
}
