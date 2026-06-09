const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mainPanel', {
  openTaskModal(action) {
    return ipcRenderer.invoke('main-panel:open-task-modal', { action })
  },
})
