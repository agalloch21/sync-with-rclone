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
}

export default mainWindow
