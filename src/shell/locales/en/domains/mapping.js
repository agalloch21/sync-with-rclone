import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  MAPPING_DELETE_PROGRESS_STEP,
  MAPPING_OPERATION,
  MAPPING_SAVE_PROGRESS_STEP,
} from '#src/app/contracts/mapping.js'
import { defineLocaleTree } from '../../locale-tree.js'

export default {
  messages: defineLocaleTree({
    [APP_MESSAGE_CODE.MAPPING_SERVER_REQUIRED]: {
      title: 'Server Required',
      message: 'Choose a remote server first.',
    },
    [APP_MESSAGE_CODE.MAPPING_LOCAL_FOLDER_REQUIRED]: {
      title: 'Local Folder Required',
      message: 'Choose a local folder first.',
    },
    [APP_MESSAGE_CODE.MAPPING_REMOTE_FOLDER_REQUIRED]: {
      title: 'Server Folder Required',
      message: 'Choose a server folder first.',
    },
    [APP_MESSAGE_CODE.MAPPING_REQUIRED]: {
      title: 'Mapping Required',
      message: 'Choose a mapping first.',
    },
    [APP_MESSAGE_CODE.MAPPING_DELETE_CONFIRMATION]: {
      title: 'Delete Mapping',
      message: 'Delete mapping "{mappingLabel}"?',
      detail: 'This removes the mapping from the configuration. It does not delete local or remote files.',
    },
  }),
  errors: defineLocaleTree({
    [APP_ERROR_CODE.MAPPING_ALREADY_EXISTS]: 'A mapping already uses this server and local folder.',
    [APP_ERROR_CODE.MAPPING_NOT_FOUND]: 'Mapping was not found.',
  }),
  operations: {
    [MAPPING_OPERATION.CREATE]: {
      title: 'Creating Mapping',
      message: 'Saving the new mapping...',
      steps: {
        [MAPPING_SAVE_PROGRESS_STEP.SAVE]: 'Saving the new mapping...',
      },
      succeeded: {
        message: 'The mapping was created successfully.',
      },
    },
    [MAPPING_OPERATION.UPDATE]: {
      title: 'Updating Mapping',
      message: 'Saving the mapping...',
      steps: {
        [MAPPING_SAVE_PROGRESS_STEP.SAVE]: 'Saving the mapping...',
      },
      succeeded: {
        message: 'The mapping was updated successfully.',
      },
    },
    [MAPPING_OPERATION.UPDATE_FILTER_PATTERNS]: {
      title: 'Updating Sync Filters',
      message: 'Saving the mapping sync filters...',
      steps: {
        [MAPPING_SAVE_PROGRESS_STEP.SAVE]: 'Saving the mapping sync filters...',
      },
      succeeded: {
        message: 'The sync filters were updated successfully.',
      },
    },
    [MAPPING_OPERATION.DELETE]: {
      title: 'Deleting Mapping',
      message: 'Deleting the mapping...',
      steps: {
        [MAPPING_DELETE_PROGRESS_STEP.DELETE]: 'Deleting the mapping...',
      },
      succeeded: {
        message: 'The mapping was deleted successfully.',
      },
    },
  },
}
