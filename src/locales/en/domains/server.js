import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { APP_OPERATION, SERVER_CREATE_PROGRESS_STEP } from '#src/app/operation-reporter.js'
import { defineLocaleTree } from '../../locale-tree.js'

export default {
  messages: defineLocaleTree({
    [APP_MESSAGE_CODE.SERVER_NAME_INVALID]: {
      title: 'Invalid Server Name',
      message: 'Specify a valid server name.',
    },
    [APP_MESSAGE_CODE.SERVER_SELECTION_REQUIRED]: {
      title: 'Server Required',
      message: 'Select a server first.',
    },
    [APP_MESSAGE_CODE.SERVER_PROTOCOL_FIELDS_INVALID]: {
      title: 'Invalid Server Configuration',
      message: 'Some server fields are invalid.',
    },
    [APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION]: {
      title: 'Delete Server',
      message: 'Delete server "{serverName}"?',
      detail: 'This removes the rclone remote from the local rclone configuration.',
    },
  }),
  errors: defineLocaleTree({
    [APP_ERROR_CODE.SERVER_INVALID_OPERATION]: 'Invalid server operation.',
    [APP_ERROR_CODE.SERVER_VALIDATION_FAILED]: 'Server validation failed.',
    [APP_ERROR_CODE.SERVER_ALREADY_EXISTS]: 'Server already exists.',
    [APP_ERROR_CODE.SERVER_NOT_FOUND]: 'Server does not exist.',
    [APP_ERROR_CODE.SERVER_CONNECTION_FAILED]: 'Server connection failed.',
    [APP_ERROR_CODE.SERVER_OPERATION_FAILED]: 'Server operation failed.',
  }),
  operations: {
    [APP_OPERATION.CREATE_SERVER]: {
      title: 'Creating Server',
      message: 'Preparing server creation...',
      steps: {
        [SERVER_CREATE_PROGRESS_STEP.SAVE]: 'Saving the server configuration...',
        [SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION]: 'Testing the server connection...',
        [SERVER_CREATE_PROGRESS_STEP.ROLLBACK]: 'Removing the temporary server configuration...',
      },
      succeeded: {
        message: 'The server was created successfully.',
      },
    },
  },
}
