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
  logPanel: {
    title: 'Operation History',
    refresh: 'Refresh',
    loading: 'Loading operation history...',
    empty: 'No operations have been recorded yet.',
    status: {
      started: 'Started',
      succeeded: 'Succeeded',
      failed: 'Failed',
      cancelled: 'Cancelled',
    },
    operations: {
      testServerConnection: 'Test server connection',
      createServer: 'Create server',
      updateServer: 'Update server',
      deleteServer: 'Delete server',
      createSyncTask: 'Create sync task',
      updateSyncTask: 'Update sync task',
      updateSyncTaskIgnorePatterns: 'Update task ignore patterns',
      deleteSyncTask: 'Delete sync task',
      updateGlobalIgnorePatterns: 'Update global ignore patterns',
      syncPush: 'Push files',
      syncPull: 'Pull files',
      sync: 'Sync files',
    },
  },
}

export default mainWindow
