import { contextBridge, ipcRenderer } from 'electron'

const encoded = process.argv.find(arg => arg.startsWith('{"getPayload"'))
const channels = encoded ? JSON.parse(encoded) : null

contextBridge.exposeInMainWorld('syncReview', {
  getPayload() {
    return ipcRenderer.invoke(channels.getPayload)
  },
  submit(result) {
    return ipcRenderer.invoke(channels.submit, result)
  },
  cancel() {
    return ipcRenderer.invoke(channels.cancel)
  },
})
