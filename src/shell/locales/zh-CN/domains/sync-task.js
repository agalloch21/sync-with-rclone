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
      title: '需要服务器',
      message: '请先选择远程服务器。',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_LOCAL_FOLDER_REQUIRED]: {
      title: '需要本地文件夹',
      message: '请先选择本地文件夹。',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_REMOTE_FOLDER_REQUIRED]: {
      title: '需要服务器文件夹',
      message: '请先选择服务器文件夹。',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_REQUIRED]: {
      title: '需要同步任务',
      message: '请先选择同步任务。',
    },
    [APP_MESSAGE_CODE.SYNC_TASK_DELETE_CONFIRMATION]: {
      title: '删除同步任务',
      message: '删除任务“{taskLabel}”吗？',
      detail: '此操作只会从配置中移除任务，不会删除本地或远程文件。',
    },
  }),
  errors: defineLocaleTree({
    [APP_ERROR_CODE.SYNC_TASK_ALREADY_EXISTS]: '已有同步任务使用此服务器和本地文件夹。',
    [APP_ERROR_CODE.SYNC_TASK_NOT_FOUND]: '未找到同步任务。',
  }),
  operations: {
    [SYNC_TASK_OPERATION.CREATE]: {
      title: '正在创建同步任务',
      message: '正在保存新的同步任务…',
      steps: {
        [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE]: '正在保存新的同步任务…',
      },
      succeeded: {
        message: '同步任务已成功创建。',
      },
    },
    [SYNC_TASK_OPERATION.UPDATE]: {
      title: '正在更新同步任务',
      message: '正在保存同步任务…',
      steps: {
        [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE]: '正在保存同步任务…',
      },
      succeeded: {
        message: '同步任务已成功更新。',
      },
    },
    [SYNC_TASK_OPERATION.UPDATE_IGNORE_PATTERNS]: {
      title: '正在更新忽略规则',
      message: '正在保存同步任务的忽略规则…',
      steps: {
        [SYNC_TASK_SAVE_PROGRESS_STEP.SAVE]: '正在保存同步任务的忽略规则…',
      },
      succeeded: {
        message: '忽略规则已成功更新。',
      },
    },
    [SYNC_TASK_OPERATION.DELETE]: {
      title: '正在删除同步任务',
      message: '正在删除同步任务…',
      steps: {
        [SYNC_TASK_DELETE_PROGRESS_STEP.DELETE]: '正在删除同步任务…',
      },
      succeeded: {
        message: '同步任务已成功删除。',
      },
    },
  },
}
