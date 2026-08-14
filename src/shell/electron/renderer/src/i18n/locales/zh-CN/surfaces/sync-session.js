import { SYNC_SESSION_STAGE } from '#electron/contracts/sync-session-stage.js'
import { SYNC_PHASES, SYNC_RESULT } from '#src/core/contract.js'

const syncSession = {
  [SYNC_SESSION_STAGE.ANALYZE]: { title: '分析' },
  [SYNC_SESSION_STAGE.REVIEW]: { title: '检查' },
  [SYNC_SESSION_STAGE.SYNC]: { title: '同步' },
  [SYNC_PHASES.PREPARATION]: '正在规范化选项',
  [SYNC_PHASES.BUILD_LOCAL_SNAPSHOT]: '正在生成本地快照',
  [SYNC_PHASES.BUILD_REMOTE_SNAPSHOT]: '正在生成远程快照',
  [SYNC_PHASES.COMPARE_SNAPSHOT]: '正在比较快照',
  [SYNC_PHASES.REVIEW_DIFFERENCES]: '正在准备差异检查',
  [SYNC_PHASES.GENERATE_PLAN]: '正在准备操作',
  [SYNC_PHASES.APPLY_PLAN]: '正在同步',
  windowTitle: '同步会话',
  context: {
    local: '本地',
    remote: '远程',
    source: '来源',
    target: '目标',
    push: '推送到',
    pull: '拉取自',
  },
  cancelButton: '取消',
  confirmButton: {
    push: '确认并推送',
    pull: '确认并拉取',
  },
  closeButton: '关闭',
  syncPhases: {
    'start': '开始应用操作',
    'resolve-conflicts': '正在解决目标路径结构冲突',
    'copy': '正在应用复制操作',
    'delete': '正在应用删除操作',
    'cleanup': '正在清理空文件夹',
    'complete': '同步完成',
  },
  result: {
    [SYNC_RESULT.COMPLETED]: {
      title: '已完成',
      message: '窗口将在 {count} 秒后关闭。',
    },
    [SYNC_RESULT.CANCELLED]: {
      title: '已取消',
      message: '已应用 {total} 个操作中的 {syncedCount} 个。',
      detailButton: '详情',
    },
    [SYNC_RESULT.FAILED]: {
      title: '错误',
      message: '同步失败。',
      logFolderHint: '如需更多信息，请',
      openLogFolder: '打开日志文件夹',
    },
  },
}

export default syncSession
