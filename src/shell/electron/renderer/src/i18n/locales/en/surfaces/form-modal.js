import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'

const formModal = {
  formModal: {
    common: {
      next: 'Next',
      cancel: 'Cancel',
      confirm: 'Confirm',
      local: 'Local',
      remote: 'Remote',
      changeFolder: 'Select Folder',
    },
    [FORM_MODAL_VIEW.CHOOSE_SERVER]: {
      title: 'Create Task',
      message: 'Choose a remote server',
    },
    [FORM_MODAL_VIEW.CREATE_SERVER]: {
      title: 'Create Task',
      message: 'Connect to a new server',
    },
    [FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING]: {
      title: 'Create Task',
      message: 'Map the local folder with the remote',
    },
    [FORM_MODAL_VIEW.EDIT_SERVER]: {
      title: 'Edit Server',
      message: 'Edit the connection',
    },
    [FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING]: {
      title: 'Edit Folder Mapping',
      message: 'Map the local folder with the remote',
    },
    [FORM_MODAL_VIEW.EDIT_PATTERNS]: {
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
  },
}

export default formModal
