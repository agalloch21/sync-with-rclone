const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('folderDialog', {
  getState() {
    return ipcRenderer.invoke('folder-dialog:get-state')
  },
  listTree(payload) {
    return ipcRenderer.invoke('folder-dialog:list-tree', payload)
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
