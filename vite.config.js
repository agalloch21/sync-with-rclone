import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  root: path.resolve('src/shell/electron/renderer'),
  base: './',
  build: {
    outDir: path.resolve('src/shell/electron/renderer/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        mainPanel: path.resolve('src/shell/electron/renderer/main-panel.html'),
        messageBox: path.resolve('src/shell/electron/renderer/message-box.html'),
        folderDialog: path.resolve('src/shell/electron/renderer/folder-dialog.html'),
        syncSession: path.resolve('src/shell/electron/renderer/sync-session.html'),
        syncTaskModal: path.resolve('src/shell/electron/renderer/sync-task-modal.html'),
      },
    },
  },
})
