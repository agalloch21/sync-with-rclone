import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  root: path.resolve('src/electron/renderer'),
  base: './',
  build: {
    outDir: path.resolve('src/electron/renderer/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        mainPanel: path.resolve('src/electron/renderer/main-panel.html'),
        messageBox: path.resolve('src/electron/renderer/message-box.html'),
        syncSession: path.resolve('src/electron/renderer/sync-session.html'),
        syncTaskModal: path.resolve('src/electron/renderer/sync-task-modal.html'),
      },
    },
  },
})
