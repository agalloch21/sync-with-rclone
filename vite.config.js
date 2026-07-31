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
  },
})
