const { contextBridge, ipcRenderer } = require('electron')

const encoded = process.argv.find(arg => arg.startsWith('{"channelPrefix"'))
const channels = encoded ? JSON.parse(encoded) : null

contextBridge.exposeInMainWorld('syncSession', {
  // notification
  onReceiveProgressEvent(callback) {
    const listener = (_, state) => callback(state)
    ipcRenderer.on(channels.progressEvent, listener)
    return () => ipcRenderer.removeListener(channels.progressEvent, listener)
  },
  // handler
  getState() {
    return ipcRenderer.invoke(channels.getState)
  },
  confirmSync(selectedPaths) {
    return ipcRenderer.invoke(channels.confirmSync, { selectedPaths })
  },
  cancelSync() {
    return ipcRenderer.invoke(channels.cancelSync)
  },
  closeWindow() {
    return ipcRenderer.invoke(channels.closeWindow)
  },
})
