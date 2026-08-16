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
    serverForm: {
      name: 'Name',
      protocol: 'Protocol',
      selectProtocol: 'Select the protocol type',
    },
    [FORM_MODAL_VIEW.CHOOSE_SERVER]: {
      title: 'Choose Server',
      message: 'Use an existing server or create a new one',
      loading: 'Loading servers...',
      chooseExisting: 'Choose from the existing servers',
      noneConfigured: 'No configured servers',
      createNew: 'Connect to a new server',
    },
    [FORM_MODAL_VIEW.CREATE_SERVER]: {
      title: 'Create Server',
      message: 'Enter the server details',
    },
    [FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING]: {
      title: 'Create Mapping',
      message: 'Map a local folder to a remote folder',
    },
    [FORM_MODAL_VIEW.EDIT_SERVER]: {
      title: 'Edit Server',
      message: 'Edit the server connection',
    },
    [FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING]: {
      title: 'Edit Folder Mapping',
      message: 'Map the local folder to the remote folder',
    },
    [FORM_MODAL_VIEW.EDIT_PATTERNS]: {
      title: 'Edit Exclusions',
      message: 'Exclude paths from synchronization in both directions',
      mappingSpecificPatterns: {
        title: 'Mapping Exclusions',
        description: 'Matched paths are not compared, copied, or deleted in Push or Pull. Negation is not supported.',
      },
      globalPatterns: {
        title: 'Global Exclusions',
        description: 'These exclusions apply to every mapping and can be changed in Settings.',
      },
    },
  },
}

export default formModal
