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
  showMessageBox(payload = {}) {
    return ipcRenderer.invoke('sync-task-modal:show-message-box', payload)
  },
  closeMessageBox(payload = { result: 'closed' }) {
    return ipcRenderer.invoke('sync-task-modal:close-message-box', payload)
  },

  ready(payload) {
    ipcRenderer.send('sync-task-modal:ready', payload)
  },
})
