import { APP_ERROR_CODE } from '#src/app/app-errors.js'

export default {
  common: {
    cancel: '取消',
    confirm: '确认',
  },
  review: {
    title: '检查同步差异',
  },
  result: {
    failed: {
      logPath: '日志：{path}',
    },
  },
  errors: {
    [APP_ERROR_CODE.UNKNOWN]: '发生未知错误。',
    [APP_ERROR_CODE.PATH_EMPTY]: '路径不能为空。',
    [APP_ERROR_CODE.PATH_NOT_FOUND]: '路径不存在：{path}',
    [APP_ERROR_CODE.PATH_NOT_DIRECTORY]: '需要一个文件夹路径，当前路径是：{path}',
    [APP_ERROR_CODE.CONFIG_LOAD_FAILED]: '读取同步配置失败：{configPath}',
    [APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK]: '没有匹配这个本地路径的同步任务：{path}',
    [APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK]: '远程路径必须在同步任务“{syncTaskName}”范围内：{remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED]: '远程文件夹路径不能为空。',
    [APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED]: '检查远程文件夹失败：{remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED]: '创建远程文件夹失败：{remotePath}',
  },
}
