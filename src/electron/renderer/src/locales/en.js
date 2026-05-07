import { PHASES, SYNC_RESULT } from '#src/core/contract.js'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { STEPS } from '#src/electron/main/session-steps.js'

export default {
  [STEPS.ANALYZE]: {
    title: 'Analyze',
  },
  [STEPS.REVIEW]: {
    title: 'Review',
  },
  [STEPS.SYNC]: {
    title: 'Sync',
  },
  [PHASES.PREPARATION]: 'Normalizing options',
  [PHASES.BUILD_LOCAL_SNAPSHOT]: 'Building local snapshot',
  [PHASES.BUILD_REMOTE_SNAPSHOT]: 'Building remote snapshot',
  [PHASES.COMPARE_SNAPSHOT]: 'Comparing snapshots',
  [PHASES.REVIEW_DIFFERENCES]: 'Preparing differences review',
  [PHASES.GENERATE_PLAN]: 'Preparing operations',
  [PHASES.APPLY_PLAN]: 'Applying operations',

  windowTitle: 'Sync Session',
  context: {
    local: 'LOCAL',
    remote: 'REMOTE',
    source: 'SOURCE',
    target: 'TARGET',
    push: 'PUSH TO',
    pull: 'PULL FROM',
  },
  cancelButton: 'Cancel',
  confirmButton: {
    push: 'Confirm & Push',
    pull: 'Confirm & Pull',
  },
  closeButton: 'Close',
  syncPhases: {
    start: 'start applying execution phases',
    mkdir: 'creating directories',
    copy: 'copying files',
    delete: 'deleting files',
    rmdir: 'deleting directories',
    complete: 'complete applying execution phases',
  },
  result: {
    [SYNC_RESULT.COMPLETED]: {
      title: 'Finished',
      message: 'The window will be closed in <u>#</u> seconds.',
    },
    [SYNC_RESULT.CANCELLED]: {
      title: 'Cancelled',
      message: '',
    },
    [SYNC_RESULT.FAILED]: {
      title: 'Error',
      message: '',
    },
  },
  errors: {
    [APP_ERROR_CODE.UNKNOWN]: 'An unknown error occurred.',
    [APP_ERROR_CODE.PATH_EMPTY]: 'Path can not be empty.',
    [APP_ERROR_CODE.PATH_NOT_FOUND]: 'Path does not exist: {path}',
    [APP_ERROR_CODE.PATH_NOT_DIRECTORY]: 'Expected a directory path, got: {path}',
    [APP_ERROR_CODE.CONFIG_LOAD_FAILED]: 'Failed to load sync configuration: {configPath}',
    [APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_JOB]: 'No sync job matches local path: {path}',
    [APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_JOB]: 'Remote path must stay within sync job "{syncJobName}": {remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED]: 'Remote folder path is required.',
    [APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED]: 'Failed to check remote folder: {remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED]: 'Failed to create remote folder: {remotePath}',
  },
}
