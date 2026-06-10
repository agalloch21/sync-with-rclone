const { contextBridge, ipcRenderer } = require('electron')

const encoded = process.argv.find(arg => arg.startsWith('{"action"'))
const state = encoded ? JSON.parse(encoded) : { action: '' }

contextBridge.exposeInMainWorld('taskModal', {
  getState() {
    return state
  },
  close() {
    return ipcRenderer.invoke('task-modal:close')
  },
  ready() {
    ipcRenderer.send('task-modal:ready')
  },
})
