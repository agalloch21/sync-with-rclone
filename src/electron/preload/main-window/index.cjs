const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mainWindow', {
  openSyncTaskModal(modalName, context = {}) {
    return ipcRenderer.invoke('main-window:open-sync-task-modal', { modalName, context })
  },
  getAppModel() {
    return ipcRenderer.invoke('main-window:get-app-model')
  },
  listSyncTasks() {
    return ipcRenderer.invoke('main-window:list-sync-tasks')
  },
  refreshAppModel() {
    return ipcRenderer.invoke('main-window:refresh-app-model')
  },
  deleteRemote(remoteName) {
    return ipcRenderer.invoke('main-window:delete-remote', { remoteName })
  },
  deleteSyncTask(taskReference) {
    return ipcRenderer.invoke('main-window:delete-sync-task', taskReference)
  },
  showMessageBox(options = {}) {
    return ipcRenderer.invoke('main-window:show-message-box', options)
  },
  closeMessageBox(action = 'close') {
    return ipcRenderer.invoke('main-window:close-message-box', { action })
  },
  onAppModelUpdated(callback) {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('main-window:app-model-updated', listener)
    return () => ipcRenderer.removeListener('main-window:app-model-updated', listener)
  },
})
