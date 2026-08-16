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
      editPatterns: 'Exclusions',
      delete: 'Delete',
    },
  },
  settingsPanel: {
    title: 'Settings',
    common: {
      apply: 'Apply',
    },
    language: {
      title: 'Language',
      description: 'Choose the language used throughout the application.',
      options: {
        'en': 'English',
        'zh-CN': '简体中文',
      },
    },
    globalPatterns: {
      title: 'Global Exclusions',
      description: 'Matched paths are excluded from Push and Pull for every mapping. Negation is not supported.',
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
      updateMappingExclusionPatterns: 'Update mapping exclusions',
      deleteMapping: 'Delete mapping',
      updateGlobalExclusionPatterns: 'Update global exclusions',
      syncPush: 'Push files',
      syncPull: 'Pull files',
      sync: 'Sync files',
    },
  },
}

export default mainWindow
