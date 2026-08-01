import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  SYNC_TASK_DELETE_PROGRESS_STEP,
  SYNC_TASK_OPERATION,
  SYNC_TASK_SAVE_PROGRESS_STEP,
} from '#src/app/contracts/task.js'
import { defineLocaleTree } from '../../locale-tree.js'

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
  operations: {
    [SYNC_TASK_OPERATION.CREATE]: {
      title: 'Creating Sync Task',
      message: 'Saving the new sync task...',
      steps: {
        [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE]: 'Saving the new sync task...',
      },
      succeeded: {
        message: 'The sync task was created successfully.',
      },
    },
    [SYNC_TASK_OPERATION.UPDATE]: {
      title: 'Updating Sync Task',
      message: 'Saving the sync task...',
      steps: {
        [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE]: 'Saving the sync task...',
      },
      succeeded: {
        message: 'The sync task was updated successfully.',
      },
    },
    [SYNC_TASK_OPERATION.UPDATE_IGNORE_PATTERNS]: {
      title: 'Updating Ignore Patterns',
      message: 'Saving the sync task ignore patterns...',
      steps: {
        [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE]: 'Saving the sync task ignore patterns...',
      },
      succeeded: {
        message: 'The ignore patterns were updated successfully.',
      },
    },
    [SYNC_TASK_OPERATION.DELETE]: {
      title: 'Deleting Sync Task',
      message: 'Deleting the sync task...',
      steps: {
        [SYNC_TASK_DELETE_PROGRESS_STEP.DELETE]: 'Deleting the sync task...',
      },
      succeeded: {
        message: 'The sync task was deleted successfully.',
      },
    },
  },
}
