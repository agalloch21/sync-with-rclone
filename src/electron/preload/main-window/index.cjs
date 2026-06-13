const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mainWindow', {
  openSyncTaskModal(modalName) {
    return ipcRenderer.invoke('main-window:open-sync-task-modal', { modalName })
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
})
