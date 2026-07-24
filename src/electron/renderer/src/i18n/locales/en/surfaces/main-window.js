const mainWindow = {
  appShell: {
    nav: {
      syncTasks: 'Sync Tasks',
      logs: 'Logs',
      settings: 'Settings',
    },
    version: 'version',
  },
  syncTasksPanel: {
    taskItem: {
      mappedTo: 'Mapped to',
      lastSync: 'Last Sync',
    },
    actions: {
      create: 'Create',
      edit: 'Edit',
      editPatterns: 'Patterns',
      delete: 'Delete',
    },
  },
  settingsPanel: {
    common: {
      apply: 'Apply',
    },
    globalPatterns: {
      title: 'Global Ignore Patterns',
      description: 'These patterns will be applied to all sync tasks.',
    },
  },
}

export default mainWindow
