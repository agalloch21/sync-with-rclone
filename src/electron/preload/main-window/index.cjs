const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mainWindow', {
  openSyncTaskModal(modalName, context = {}) {
    return ipcRenderer.invoke('main-window:open-sync-task-modal', { modalName, context })
  },
  getMainWindowData() {
    return ipcRenderer.invoke('main-window:get-data')
  },
  getServer(payload) {
    return ipcRenderer.invoke('main-window:get-server', payload)
  },
  deleteServer(payload) {
    return ipcRenderer.invoke('main-window:delete-server', payload)
  },
  deleteSyncTask(payload) {
    return ipcRenderer.invoke('main-window:delete-sync-task', payload)
  },
  showMessageBox(options = {}) {
    return ipcRenderer.invoke('main-window:show-message-box', options)
  },
  closeMessageBox(action = 'close') {
    return ipcRenderer.invoke('main-window:close-message-box', { action })
  },
  onConfigUpdated(callback) {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('main-window:config-updated', listener)
    return () => ipcRenderer.removeListener('main-window:config-updated', listener)
  },
})
