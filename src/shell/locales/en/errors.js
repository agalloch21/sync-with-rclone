import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { defineLocaleTree } from '../locale-tree.js'

export default {
  errors: defineLocaleTree({
    [APP_ERROR_CODE.UNKNOWN]: 'An unknown error occurred.',
    [APP_ERROR_CODE.PATH_INVALID]: 'Invalid local directory path.',
    [APP_ERROR_CODE.CONFIG_LOAD_FAILED]: 'Failed to load configuration.',
    [APP_ERROR_CODE.CONFIG_UPDATE_FAILED]: 'Failed to update configuration: {configPath}',
    [APP_ERROR_CODE.CONFIG_NO_MATCHING_MAPPING]: 'No mapping matches local path: {path}',
    [APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_MAPPING]: 'Remote path must stay within mapping "{mappingName}": {remotePath}',
    [APP_ERROR_CODE.SYNC_SESSION_OVERLAP]: 'Another sync session is already using an overlapping local or remote folder.',
    [APP_ERROR_CODE.SYNC_EXECUTION_FAILED]: 'Synchronization failed.',
    [APP_ERROR_CODE.SYNC_REMOTE_SOURCE_NOT_FOUND]: 'The remote source folder does not exist: {remoteFolderPath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED]: 'Remote folder path is required.',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_INVALID]: 'The remote folder path is invalid.',
    [APP_ERROR_CODE.IPC_INVALID_PAYLOAD]: 'The application received an invalid request.',
    [APP_ERROR_CODE.IPC_UNAVAILABLE]: 'The application could not complete the request.',
  }),
}
