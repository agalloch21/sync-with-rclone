import { contextBridge, ipcRenderer } from 'electron'

const encoded = process.argv.find(arg => arg.startsWith('{"submitChannel"'))
const channels = encoded ? JSON.parse(encoded) : null

contextBridge.exposeInMainWorld('syncReview', {
  submit(result) {
    return ipcRenderer.invoke(channels.submitChannel, result)
  },
  cancel() {
    return ipcRenderer.invoke(channels.cancelChannel)
  },
})
