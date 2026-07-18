const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('folderDialog', {
  getState() {
    return ipcRenderer.invoke('folder-dialog:get-state')
  },
  listTree() {
    return ipcRenderer.invoke('folder-dialog:list-tree')
  },
  confirm(payload) {
    return ipcRenderer.invoke('folder-dialog:confirm', payload)
  },
  cancel() {
    return ipcRenderer.invoke('folder-dialog:cancel')
  },
  ready() {
    ipcRenderer.send('folder-dialog:ready')
  },
})
