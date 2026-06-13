const { contextBridge, ipcRenderer } = require('electron')

const encoded = process.argv.find(arg => arg.startsWith('{"modalName"'))
const state = encoded ? JSON.parse(encoded) : { modalName: '' }

contextBridge.exposeInMainWorld('syncTaskModal', {
  getState() {
    return state
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
  ready(payload) {
    ipcRenderer.send('sync-task-modal:ready', payload)
  },
})
