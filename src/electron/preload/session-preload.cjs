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
  // event
  confirmSync(selectedPaths) {
    ipcRenderer.send(channels.confirmSync, { selectedPaths })
  },
  cancelSync() {
    ipcRenderer.send(channels.cancelSync)
  },
})
