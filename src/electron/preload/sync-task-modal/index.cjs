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
  createRemote(payload) {
    return ipcRenderer.invoke('sync-task-modal:create-remote', payload)
  },
  updateRemote(payload) {
    return ipcRenderer.invoke('sync-task-modal:update-remote', payload)
  },
  deleteRemote(remoteName) {
    return ipcRenderer.invoke('sync-task-modal:delete-remote', { remoteName })
  },
  deleteSyncTask(taskIdentity) {
    return ipcRenderer.invoke('sync-task-modal:delete-sync-task', taskIdentity)
  },
  ready(payload) {
    ipcRenderer.send('sync-task-modal:ready', payload)
  },
})
