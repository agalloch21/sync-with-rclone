const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('syncSession', {
  onEvent(callback) {
    ipcRenderer.on('progress', callback)
  },
  onReceiveDifferences(callback) {
    ipcRenderer.on('differences', callback)
  },
  getDifferences() {
    return ipcRenderer.involke('get-differences')
  },
  confirmSync(payload) {
    ipcRenderer.send('confirm-sync', payload)
  },
  cancelSync() {
    ipcRenderer.send('cancel-sync')
  },
})
