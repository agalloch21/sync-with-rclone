const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mainWindow', {
  openSyncTaskModal(modalName) {
    return ipcRenderer.invoke('main-window:open-sync-task-modal', { modalName })
  },
})
