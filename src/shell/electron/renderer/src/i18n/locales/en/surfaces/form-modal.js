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
      title: 'Create Mapping',
      message: 'Choose a remote server',
    },
    [FORM_MODAL_VIEW.CREATE_SERVER]: {
      title: 'Create Mapping',
      message: 'Connect to a new server',
    },
    [FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING]: {
      title: 'Create Mapping',
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
      title: 'Edit Sync Filters',
      message: 'Exclude paths from synchronization in both directions',
      mappingSpecificPatterns: {
        title: 'Mapping Sync Filters',
        description: 'Matched paths are not compared, copied, or deleted in Push or Pull. Negation is not supported.',
      },
      globalPatterns: {
        title: 'Inherited Global Filters',
        description: 'These filters apply to every mapping and can be changed in Settings.',
      },
    },
  },
}

export default formModal
