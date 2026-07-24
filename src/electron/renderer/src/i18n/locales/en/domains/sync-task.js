import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { defineLocaleTree } from '../../../locale-tree.js'

export default {
  messages: defineLocaleTree({
    [APP_MESSAGE_CODE.SYNC_TASK_SERVER_REQUIRED]: {
      title: 'Server Required',
      message: 'Choose a remote server first.',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_LOCAL_FOLDER_REQUIRED]: {
      title: 'Local Folder Required',
      message: 'Choose a local folder first.',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_REMOTE_FOLDER_REQUIRED]: {
      title: 'Server Folder Required',
      message: 'Choose a server folder first.',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_REQUIRED]: {
      title: 'Task Required',
      message: 'Choose a sync task first.',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_DELETE_CONFIRMATION]: {
      title: 'Delete Sync Task',
      message: 'Delete task "{taskLabel}"?',
      detail: 'This removes the task from the configuration. It does not delete local or remote files.',
    },
  }),
  errors: defineLocaleTree({
    [APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS]: 'A sync task already uses this server and local folder.',
    [APP_ERROR_CODE.SYNC_TASK_NOT_FOUND]: 'Sync task was not found.',
  }),
  operations: {},
}
