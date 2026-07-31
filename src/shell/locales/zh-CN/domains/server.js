import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_DELETE_PROGRESS_STEP,
  SERVER_OPERATION,
  SERVER_UPDATE_PROGRESS_STEP,
} from '#src/app/operations/server-operation-contract.js'
import { SYNC_TASK_RETARGET_PROGRESS_STEP } from '#src/app/operations/task-operation-contract.js'
import { defineLocaleTree } from '../../locale-tree.js'

export default {
  messages: defineLocaleTree({
    [APP_MESSAGE_CODE.SERVER_NAME_INVALID]: {
      title: '服务器名称无效',
      message: '请指定有效的服务器名称。',
    },
    [APP_MESSAGE_CODE.SERVER_SELECTION_REQUIRED]: {
      title: '需要服务器',
      message: '请先选择服务器。',
    },
    [APP_MESSAGE_CODE.SERVER_PROTOCOL_FIELDS_INVALID]: {
      title: '服务器配置无效',
      message: '部分服务器字段无效。',
    },
    [APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION]: {
      title: '删除服务器',
      message: '删除服务器“{serverName}”吗？',
      detail: '此操作会从本地 rclone 配置中移除该远程服务器。',
    },
  }),
  errors: defineLocaleTree({
    [APP_ERROR_CODE.SERVER_INVALID_OPERATION]: '服务器操作无效。',
    [APP_ERROR_CODE.SERVER_VALIDATION_FAILED]: '服务器验证失败。',
    [APP_ERROR_CODE.SERVER_ALREADY_EXISTS]: '服务器已存在。',
    [APP_ERROR_CODE.SERVER_NOT_FOUND]: '服务器不存在。',
    [APP_ERROR_CODE.SERVER_CONNECTION_FAILED]: '服务器连接失败。',
    [APP_ERROR_CODE.SERVER_OPERATION_FAILED]: '服务器操作失败。',
  }),
  operations: {
    [SERVER_OPERATION.CREATE]: {
      title: '正在创建服务器',
      message: '正在准备创建服务器…',
      steps: {
        [SERVER_CREATE_PROGRESS_STEP.SAVE]: '正在保存服务器配置…',
        [SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION]: '正在测试服务器连接…',
        [SERVER_CREATE_PROGRESS_STEP.ROLLBACK]: '正在移除临时服务器配置…',
      },
      succeeded: {
        message: '服务器已成功创建。',
      },
    },
    [SERVER_OPERATION.UPDATE]: {
      title: '正在更新服务器',
      message: '正在准备更新服务器…',
      steps: {
        [SERVER_UPDATE_PROGRESS_STEP.SAVE]: '正在保存服务器配置…',
        [SYNC_TASK_RETARGET_PROGRESS_STEP.RETARGET]: '正在更新同步任务引用…',
      },
      succeeded: {
        message: '服务器已成功更新。',
      },
    },
    [SERVER_OPERATION.DELETE]: {
      title: '正在删除服务器',
      message: '正在删除服务器配置…',
      steps: {
        [SERVER_DELETE_PROGRESS_STEP.DELETE]: '正在删除服务器配置…',
      },
      succeeded: {
        message: '服务器已成功删除。',
      },
    },
  },
}
