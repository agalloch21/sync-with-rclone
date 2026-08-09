const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mainWindow', {
  openFormModal(view, context = {}) {
    return ipcRenderer.invoke('main-window:open-form-modal', { view, context })
  },
  getMainWindowData() {
    return ipcRenderer.invoke('main-window:get-data')
  },
  getGlobalIgnorePatterns() {
    return ipcRenderer.invoke('main-window:get-global-ignore-patterns')
  },
  openConfigFolder() {
    return ipcRenderer.invoke('main-window:open-config-folder')
  },
  openLocalFolder(localFolderPath) {
    return ipcRenderer.invoke('main-window:open-local-folder', { localFolderPath })
  },
  getOperationHistory(payload = {}) {
    return ipcRenderer.invoke('main-window:get-operation-history', payload)
  },
  getServer(payload) {
    return ipcRenderer.invoke('main-window:get-server', payload)
  },
  deleteServer(payload) {
    return ipcRenderer.invoke('main-window:delete-server', payload)
  },
  deleteMapping(payload) {
    return ipcRenderer.invoke('main-window:delete-mapping', payload)
  },
  updateGlobalIgnorePatterns(payload) {
    return ipcRenderer.invoke('main-window:update-global-ignore-patterns', payload)
  },
  showMessageBox(payload = {}) {
    return ipcRenderer.invoke('main-window:show-message-box', payload)
  },
  closeMessageBox(payload = { result: 'closed' }) {
    return ipcRenderer.invoke('main-window:close-message-box', payload)
  },
  onConfigUpdated(callback) {
    const listener = () => callback()
    ipcRenderer.on('main-window:config-updated', listener)
    return () => ipcRenderer.removeListener('main-window:config-updated', listener)
  },
  onOperationHistoryUpdated(callback) {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('main-window:operation-history-updated', listener)
    return () => ipcRenderer.removeListener('main-window:operation-history-updated', listener)
  },
})
