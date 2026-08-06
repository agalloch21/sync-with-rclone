const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('formModal', {
  getState() {
    return ipcRenderer.invoke('form-modal:get-state')
  },
  close() {
    return ipcRenderer.invoke('form-modal:close')
  },
  listServers() {
    return ipcRenderer.invoke('form-modal:list-servers')
  },
  getServer(payload) {
    return ipcRenderer.invoke('form-modal:get-server', payload)
  },
  createServer(payload) {
    return ipcRenderer.invoke('form-modal:create-server', payload)
  },
  updateServer(payload) {
    return ipcRenderer.invoke('form-modal:update-server', payload)
  },
  createMapping(payload) {
    return ipcRenderer.invoke('form-modal:create-mapping', payload)
  },
  updateMapping(payload) {
    return ipcRenderer.invoke('form-modal:update-mapping', payload)
  },
  updateMappingIgnorePatterns(payload) {
    return ipcRenderer.invoke('form-modal:update-mapping-ignore-patterns', payload)
  },
  selectLocalFolder(payload = {}) {
    return ipcRenderer.invoke('form-modal:select-local-folder', payload)
  },
  selectRemoteFolder(payload = {}) {
    return ipcRenderer.invoke('form-modal:select-remote-folder', payload)
  },
  showMessageBox(payload = {}) {
    return ipcRenderer.invoke('form-modal:show-message-box', payload)
  },
  closeMessageBox(payload = { result: 'closed' }) {
    return ipcRenderer.invoke('form-modal:close-message-box', payload)
  },

  ready(payload) {
    ipcRenderer.send('form-modal:ready', payload)
  },
})
