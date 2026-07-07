const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('syncTaskModal', {
  getState() {
    return ipcRenderer.invoke('sync-task-modal:get-state')
  },
  close() {
    return ipcRenderer.invoke('sync-task-modal:close')
  },
  listServers() {
    return ipcRenderer.invoke('sync-task-modal:list-servers')
  },
  getServer(payload) {
    return ipcRenderer.invoke('sync-task-modal:get-server', payload)
  },
  createServer(payload) {
    return ipcRenderer.invoke('sync-task-modal:create-server', payload)
  },
  updateServer(payload) {
    return ipcRenderer.invoke('sync-task-modal:update-server', payload)
  },
  showMessageBox(options = {}) {
    return ipcRenderer.invoke('sync-task-modal:show-message-box', options)
  },
  closeMessageBox(action = 'close') {
    return ipcRenderer.invoke('sync-task-modal:close-message-box', { action })
  },

  ready(payload) {
    ipcRenderer.send('sync-task-modal:ready', payload)
  },
})
