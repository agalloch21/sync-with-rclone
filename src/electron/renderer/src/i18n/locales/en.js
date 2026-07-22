import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import { APP_OPERATION } from '#src/app/operation-progress-contract.js'
import { PHASES, SYNC_RESULT } from '#src/core/contract.js'
import { STEPS } from '#src/electron/main/sync-session/steps.js'

export default {
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    ok: 'OK',
  },
  appShell: {
    nav: {
      syncTasks: 'Sync Tasks',
      logs: 'Logs',
      settings: 'Settings',
    },
    version: 'version',
  },
  operationProgress: {
    common: {
      title: 'Working',
      preparing: 'Preparing the operation...',
      start: 'Operation starts.',
      finish: 'Operation successfully finishes.',

      failedTitle: 'Operation Failed',
      errorTitle: 'Error',
      failedMessage: 'The operation failed.',
    },
    [APP_OPERATION.CREATE_SERVER]: {
      title: 'Creating Server',
      steps: {
        save: 'Saving the server configuration...',
        testConnection: 'Testing the server connection...',
        rollback: 'Something is wrong. Removing the temporary server configuration...',
      },
    },
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
        local: 'Local',
        remote: 'Remote',
        changeFolder: 'Select Folder',
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
        message: 'Edit the connection',
      },
      [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: {
        title: 'Edit Folder Mapping',
        message: 'Map the local folder with the remote',
      },
      [SYNC_TASK_MODALS.EDIT_PATTERNS]: {
        title: 'Edit Patterns',
        message: 'Set extra ignore patterns for sync task',
        taskSpecificPatterns: {
          title: 'Task-specific Ignore Patterns',
          description: 'These patterns will work in conjunction with .ignore file to filter files when syncing.',
        },
        globalPatterns: {
          title: 'Global Ignore Patterns',
          description: 'These patterns can be changed in settings panel.',
        },
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
  settingsPanel: {
    common: {
      apply: 'Apply',
    },
    globalPatterns: {
      title: 'Global Ignore Patterns',
      description: 'These patterns will be applied to all sync tasks.',
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
    [APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS]: 'A sync task already uses this server and local folder.',
    [APP_ERROR_CODE.SYNC_TASK_NOT_FOUND]: 'Sync task was not found.',
    server: {
      invalid_operation: 'Invalid server operation.',
      validation_failed: 'Server validation failed.',
      already_exists: 'Server already exists.',
      not_found: 'Server does not exist.',
      connection_failed: 'Server connection failed.',
      operation_failed: 'Server operation failed.',
    },
  },
}
