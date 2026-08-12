const mainWindow = {
  appShell: {
    nav: {
      mappings: 'Mappings',
      logs: 'Logs',
      settings: 'Settings',
    },
    version: 'version',
  },
  configurationError: {
    title: 'Configuration requires immediate attention',
    instruction: 'Correct the configuration file, then restart the application.',
    openFolder: 'Open configuration folder',
  },
  mappingsPanel: {
    empty: {
      title: 'No servers or mappings yet',
      description: 'Select Create to add a server and set up your first folder mapping.',
    },
    mappingItem: {
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
      description: 'These patterns will be applied to all mappings.',
    },
    openConfigFolder: 'Open Config Folder',
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
      createMapping: 'Create mapping',
      updateMapping: 'Update mapping',
      updateMappingIgnorePatterns: 'Update mapping ignore patterns',
      deleteMapping: 'Delete mapping',
      updateGlobalIgnorePatterns: 'Update global ignore patterns',
      syncPush: 'Push files',
      syncPull: 'Pull files',
      sync: 'Sync files',
    },
  },
}

export default mainWindow
