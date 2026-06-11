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
  ready(payload) {
    ipcRenderer.send('sync-task-modal:ready', payload)
  },
})
