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
      title: '需要服务器',
      message: '请先选择远程服务器。',
    },
    [APP_MESSAGE_CODE.MAPPING_LOCAL_FOLDER_REQUIRED]: {
      title: '需要本地文件夹',
      message: '请先选择本地文件夹。',
    },
    [APP_MESSAGE_CODE.MAPPING_REMOTE_FOLDER_REQUIRED]: {
      title: '需要服务器文件夹',
      message: '请先选择服务器文件夹。',
    },
    [APP_MESSAGE_CODE.MAPPING_REQUIRED]: {
      title: '需要映射',
      message: '请先选择映射。',
    },
    [APP_MESSAGE_CODE.MAPPING_DELETE_CONFIRMATION]: {
      title: '删除映射',
      message: '删除映射“{mappingLabel}”吗？',
      detail: '此操作只会从配置中移除映射，不会删除本地或远程文件。',
    },
  }),
  errors: defineLocaleTree({
    [APP_ERROR_CODE.MAPPING_ALREADY_EXISTS]: '已有映射使用此服务器和本地文件夹。',
    [APP_ERROR_CODE.MAPPING_NOT_FOUND]: '未找到映射。',
  }),
  operations: {
    [MAPPING_OPERATION.CREATE]: {
      title: '正在创建映射',
      message: '正在保存新的映射…',
      steps: {
        [MAPPING_SAVE_PROGRESS_STEP.SAVE]: '正在保存新的映射…',
      },
      succeeded: {
        message: '映射已成功创建。',
      },
    },
    [MAPPING_OPERATION.UPDATE]: {
      title: '正在更新映射',
      message: '正在保存映射…',
      steps: {
        [MAPPING_SAVE_PROGRESS_STEP.SAVE]: '正在保存映射…',
      },
      succeeded: {
        message: '映射已成功更新。',
      },
    },
    [MAPPING_OPERATION.UPDATE_IGNORE_PATTERNS]: {
      title: '正在更新忽略规则',
      message: '正在保存映射的忽略规则…',
      steps: {
        [MAPPING_SAVE_PROGRESS_STEP.SAVE]: '正在保存映射的忽略规则…',
      },
      succeeded: {
        message: '忽略规则已成功更新。',
      },
    },
    [MAPPING_OPERATION.DELETE]: {
      title: '正在删除映射',
      message: '正在删除映射…',
      steps: {
        [MAPPING_DELETE_PROGRESS_STEP.DELETE]: '正在删除映射…',
      },
      succeeded: {
        message: '映射已成功删除。',
      },
    },
  },
}
