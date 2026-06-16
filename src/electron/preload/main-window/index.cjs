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
  onAppModelUpdated(callback) {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('main-window:app-model-updated', listener)
    return () => ipcRenderer.removeListener('main-window:app-model-updated', listener)
  },
})
