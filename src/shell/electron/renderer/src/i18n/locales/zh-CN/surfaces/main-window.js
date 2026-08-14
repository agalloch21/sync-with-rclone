const mainWindow = {
  appShell: {
    nav: {
      mappings: '映射',
      logs: '日志',
      settings: '设置',
    },
    version: '版本',
  },
  configurationError: {
    title: '配置需要立即处理',
    instruction: '请修正配置文件后重新启动应用。',
    openFolder: '打开配置文件夹',
  },
  mappingsPanel: {
    empty: {
      title: '还没有服务器或映射',
      description: '请选择“创建”来添加服务器并设置第一个文件夹映射。',
    },
    mappingItem: {
      mappedTo: '映射到',
      lastSync: '上次同步',
    },
    actions: {
      create: '创建',
      edit: '编辑',
      editPatterns: '同步过滤',
      delete: '删除',
    },
  },
  settingsPanel: {
    common: {
      apply: '应用',
    },
    globalPatterns: {
      title: '全局同步过滤规则',
      description: '匹配路径在所有映射的推送和拉取中均不参与同步；不支持否定规则。',
    },
    openConfigFolder: '打开配置文件夹',
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
      createMapping: '创建映射',
      updateMapping: '更新映射',
      updateMappingFilterPatterns: '更新映射同步过滤规则',
      deleteMapping: '删除映射',
      updateGlobalFilterPatterns: '更新全局同步过滤规则',
      syncPush: '推送文件',
      syncPull: '拉取文件',
      sync: '同步文件',
    },
  },
}

export default mainWindow
