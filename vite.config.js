import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  root: path.resolve('src/electron/renderer'),
  base: './',
  build: {
    outDir: path.resolve('src/electron/renderer/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        review: path.resolve('src/electron/renderer/review.html'),
        progress: path.resolve('src/electron/renderer/progress.html'),
      },
    },
  },
})
