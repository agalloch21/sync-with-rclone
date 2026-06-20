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
  testRemote(remoteName) {
    return ipcRenderer.invoke('sync-task-modal:test-remote', { remoteName })
  },
  createRemote(remote) {
    return ipcRenderer.invoke('sync-task-modal:create-remote', remote)
  },
  updateRemote(remote) {
    return ipcRenderer.invoke('sync-task-modal:update-remote', remote)
  },
  deleteRemote(remoteName) {
    return ipcRenderer.invoke('sync-task-modal:delete-remote', { remoteName })
  },
  deleteSyncTask(taskReference) {
    return ipcRenderer.invoke('sync-task-modal:delete-sync-task', taskReference)
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
