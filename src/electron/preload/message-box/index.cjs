const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('messageBox', {
  getState() {
    return ipcRenderer.invoke('message-box:get-state')
  },
  ready() {
    ipcRenderer.send('message-box:ready')
  },
  onState(callback) {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('message-box:set-state', listener)
    return () => ipcRenderer.removeListener('message-box:set-state', listener)
  },
  action(action) {
    return ipcRenderer.invoke('message-box:action', { action })
  },
})
