import { createRequire } from 'node:module'
import { loadRendererEntry } from './renderer-entry.js'

const require = createRequire(import.meta.url)

export function createMainWindow() {
  const { BrowserWindow } = require('electron')

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 640,
    minHeight: 480,
    autoHideMenuBar: true,
    frame: false,
    show: false,
    title: 'Sync with rclone',
    webPreferences: {
      contextIsolation: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.warn(`[main-panel:${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`Main panel failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
  })

  loadRendererEntry(mainWindow, 'main-panel')
    .catch((error) => {
      console.error(error)
      if (!mainWindow.isDestroyed())
        mainWindow.close()
    })

  if (process.env.DEBUG_ELECTRON === '1')
    mainWindow.webContents.openDevTools({ mode: 'detach' })

  return mainWindow
}
