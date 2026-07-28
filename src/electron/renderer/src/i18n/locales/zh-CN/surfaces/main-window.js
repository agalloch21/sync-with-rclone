const mainWindow = {
  appShell: {
    nav: {
      syncTasks: '同步任务',
      logs: '日志',
      settings: '设置',
    },
    version: '版本',
  },
  syncTasksPanel: {
    taskItem: {
      mappedTo: '映射到',
      lastSync: '上次同步',
    },
    actions: {
      create: '创建',
      edit: '编辑',
      editPatterns: '规则',
      delete: '删除',
    },
  },
  settingsPanel: {
    common: {
      apply: '应用',
    },
    globalPatterns: {
      title: '全局忽略规则',
      description: '这些规则将应用于所有同步任务。',
    },
  },
  logPanel: {
    title: '操作记录',
    refresh: '刷新',
    loading: '正在读取操作记录……',
    empty: '还没有记录任何操作。',
    status: {
      started: '已开始',
      succeeded: '成功',
      failed: '失败',
      cancelled: '已取消',
    },
    operations: {
      testServerConnection: '测试服务器连接',
      createServer: '创建服务器',
      updateServer: '更新服务器',
      deleteServer: '删除服务器',
      createSyncTask: '创建同步任务',
      updateSyncTask: '更新同步任务',
      updateSyncTaskIgnorePatterns: '更新任务忽略规则',
      deleteSyncTask: '删除同步任务',
      updateGlobalIgnorePatterns: '更新全局忽略规则',
      syncPush: '推送文件',
      syncPull: '拉取文件',
      sync: '同步文件',
    },
  },
}

export default mainWindow
