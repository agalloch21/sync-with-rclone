import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import { PHASES, SYNC_RESULT } from '#src/core/contract.js'
import { STEPS } from '#src/electron/main/sync-session/steps.js'

export default {
  appShell: {
    nav: {
      syncTasks: 'Sync Tasks',
      logs: 'Logs',
      settings: 'Settings',
    },
    version: 'version',
  },
  syncTasks: {
    task: {
      extra: {
        remoteFolderLabel: 'Mapped to',
        lastSyncLabel: 'Last Sync',
      },
    },
    toolbar: {
      [SYNC_TASK_MODALS.CHOOSE_SERVER]: 'Create',
      [SYNC_TASK_MODALS.CREATE_SERVER]: 'Create',
      [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: 'Create',
      [SYNC_TASK_MODALS.EDIT_SERVER]: 'Edit',
      [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: 'Edit',
      [SYNC_TASK_MODALS.EDIT_PATTERNS]: 'Patterns',
      [SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]: 'Delete',
      [SYNC_TASK_MODALS.CONFIRM_DELETE_TASK]: 'Delete',
    },
    modals: {
      common: {
        next: 'Next',
        cancel: 'Cancel',
        confirm: 'Confirm',
      },
      [SYNC_TASK_MODALS.CHOOSE_SERVER]: {
        title: 'Create Task',
        message: 'Choose a remote server',
      },
      [SYNC_TASK_MODALS.CREATE_SERVER]: {
        title: 'Create Task',
        message: 'Connect to a new server',
      },
      [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: {
        title: 'Create Task',
        message: 'Map the local folder with the remote',
      },
      [SYNC_TASK_MODALS.EDIT_SERVER]: {
        title: 'Edit Server',
        message: 'Edit the server',
      },
      [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: {
        title: 'Edit Folder Mapping',
        message: 'Map the local folder with the remote',
      },
      [SYNC_TASK_MODALS.EDIT_PATTERNS]: {
        title: 'Edit Patterns',
        message: 'Edit the patterns',
      },
      [SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]: {
        title: 'Delete Server',
        message: 'Confirm deleting this server',
      },
      [SYNC_TASK_MODALS.CONFIRM_DELETE_TASK]: {
        title: 'Delete Task',
        message: 'Confirm deleting this sync task',
      },
    },
  },
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
  [PHASES.APPLY_PLAN]: 'Syncing',

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
    start: 'start applying operations',
    copy: 'applying copy operations',
    delete: 'applying delete operations',
    cleanup: 'cleaning up empty folders',
    complete: 'syncing completed',
  },
  result: {
    [SYNC_RESULT.COMPLETED]: {
      title: 'Finished',
      message: 'The window will be closed in {count} seconds.',
    },
    [SYNC_RESULT.CANCELLED]: {
      title: 'Cancelled',
      message: '{syncedCount} of {total} operations are applied.',
      detailButton: 'details',
    },
    [SYNC_RESULT.FAILED]: {
      title: 'Error',
      message: '',
      logPath: 'For more information, Please check',
    },
  },
  errors: {
    [APP_ERROR_CODE.UNKNOWN]: 'An unknown error occurred.',
    [APP_ERROR_CODE.PATH_EMPTY]: 'Path can not be empty.',
    [APP_ERROR_CODE.PATH_NOT_FOUND]: 'Path does not exist: {path}',
    [APP_ERROR_CODE.PATH_NOT_DIRECTORY]: 'Expected a directory path, got: {path}',
    [APP_ERROR_CODE.CONFIG_LOAD_FAILED]: 'Failed to load sync configuration: {configPath}',
    [APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK]: 'No sync task matches local path: {path}',
    [APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK]: 'Remote path must stay within sync task "{syncTaskName}": {remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED]: 'Remote folder path is required.',
    [APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED]: 'Failed to check remote folder: {remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED]: 'Failed to create remote folder: {remotePath}',
  },
}
