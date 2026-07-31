import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { defineLocaleTree } from '../locale-tree.js'

export default {
  errors: defineLocaleTree({
    [APP_ERROR_CODE.UNKNOWN]: '发生未知错误。',
    [APP_ERROR_CODE.PATH_INVALID]: '本地文件夹路径无效。',
    [APP_ERROR_CODE.PATH_EMPTY]: '路径不能为空。',
    [APP_ERROR_CODE.PATH_NOT_FOUND]: '路径不存在：{path}',
    [APP_ERROR_CODE.PATH_NOT_DIRECTORY]: '需要文件夹路径，当前路径为：{path}',
    [APP_ERROR_CODE.CONFIG_LOAD_FAILED]: '读取同步配置失败：{configPath}',
    [APP_ERROR_CODE.CONFIG_UPDATE_FAILED]: '更新同步配置失败：{configPath}',
    [APP_ERROR_CODE.CONFIG_UPDATE_IN_PROGRESS]: '另一个配置更新正在进行中。',
    [APP_ERROR_CODE.CONFIG_NO_MATCHING_SYNC_TASK]: '没有与本地路径匹配的同步任务：{path}',
    [APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_TASK]: '远程路径必须位于同步任务“{syncTaskName}”内：{remotePath}',
    [APP_ERROR_CODE.SYNC_SESSION_OVERLAP]: '另一个同步会话正在使用重叠的本地或远程文件夹。',
    [APP_ERROR_CODE.SYNC_EXECUTION_FAILED]: '同步失败。',
    [APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED]: '必须指定远程文件夹路径。',
    [APP_ERROR_CODE.REMOTE_FOLDER_PROBE_FAILED]: '检查远程文件夹失败：{remotePath}',
    [APP_ERROR_CODE.REMOTE_FOLDER_CREATE_FAILED]: '创建远程文件夹失败：{remotePath}',
    [APP_ERROR_CODE.IPC_INVALID_PAYLOAD]: '应用收到了无效请求。',
    [APP_ERROR_CODE.IPC_UNAVAILABLE]: '应用无法完成此请求。',
    [APP_ERROR_CODE.RCLONE_UNSUPPORTED_PROTOCOL]: '不支持所选的服务器协议。',
    [APP_ERROR_CODE.RCLONE_INVALID_OPERATION]: 'rclone 操作无效。',
    [APP_ERROR_CODE.RCLONE_INVALID_REMOTE]: 'rclone 远程配置无效。',
    [APP_ERROR_CODE.RCLONE_REMOTE_EXISTS]: 'rclone 远程配置已存在。',
    [APP_ERROR_CODE.RCLONE_REMOTE_MISSING]: 'rclone 远程配置不存在。',
    [APP_ERROR_CODE.RCLONE_COMMAND_FAILED]: 'rclone 命令执行失败。',
    [APP_ERROR_CODE.RCLONE_PARSE_FAILED]: '解析 rclone 响应失败。',
    [APP_ERROR_CODE.RCLONE_OPERATION_FAILED]: 'rclone 操作失败。',
  }),
}
