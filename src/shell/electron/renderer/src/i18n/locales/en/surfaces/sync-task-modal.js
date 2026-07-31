import { SYNC_TASK_MODALS } from '#electron/contracts/sync-task-modal.js'

const syncTaskModal = {
  syncTaskModal: {
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
}

export default syncTaskModal
