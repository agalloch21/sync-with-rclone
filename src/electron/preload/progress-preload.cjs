const { contextBridge, ipcRenderer } = require('electron')

const encoded = process.argv.find(arg => arg.startsWith('{"getState"'))
const channels = encoded ? JSON.parse(encoded) : null

contextBridge.exposeInMainWorld('syncProgress', {
  getState() {
    return ipcRenderer.invoke(channels.getState)
  },
  onUpdate(callback) {
    const listener = (_, state) => callback(state)
    ipcRenderer.on(channels.update, listener)
    return () => ipcRenderer.removeListener(channels.update, listener)
  },
})

