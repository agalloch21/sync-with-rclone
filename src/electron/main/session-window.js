import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const rendererDistDirectory = path.join(__dirname, '../renderer/dist')

function normalizeDevServerUrl(input) {
  return input ? input.replace(/\/$/, '') : ''
}

function getRendererEntryTarget(pageName) {
  const devServerUrl = normalizeDevServerUrl(process.env.ELECTRON_RENDERER_DEV_SERVER_URL)

  if (devServerUrl) {
    return {
      type: 'url',
      value: `${devServerUrl}/${pageName}.html`,
    }
  }

  return {
    type: 'file',
    value: path.join(rendererDistDirectory, `${pageName}.html`),
  }
}

function loadRendererPage(browserWindow, pageName) {
  const target = getRendererEntryTarget(pageName)
  return target.type === 'url'
    ? browserWindow.loadURL(target.value)
    : browserWindow.loadFile(target.value)
}

export function createSessionWindow() {
  const { BrowserWindow, ipcMain } = require('electron')

  const sessionWindow = new BrowserWindow({
    width: 560,
    height: 320,
    minWidth: 500,
    minHeight: 280,
    autoHideMenuBar: true,
    show: false,
    title: 'Sync Progress',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/session-preload.cjs'),
    //   additionalArguments: [JSON.stringify(channels)],
    },
  })

  function onEventHandler(event) {
    sessionWindow.webContents.send('progress', JSON.stringify(event))
  }

  let sendBackResult = null
  let sendBackError = null
  async function reviewDiffInWindow(diffSnapshot) {
    const colors = ['red', 'blue', 'green', 'yellow']
    sessionWindow.webContents.send('differences', JSON.stringify(colors))

    return new Promise((resolve, reject) => {
      sendBackResult = (action, payload) => {
        if (action === 'confirm') {
          return resolve({ action: 'confirm', selectedPaths: JSON.parse(payload) })
        }
        else if (action === 'cancel') {
          return resolve({ action: 'cancel', selectedPaths: [] })
        }
      }
      sendBackError = (error) => {
        return reject(error)
      }
    })
  }

  ipcMain.handle('get-differences', () => {
    const colors = ['red', 'blue', 'green', 'yellow']
    return JSON.stringify(colors)
  })

  ipcMain.on('cancel-sync', () => {
    sendBackResult && sendBackResult('cancel')
  })

  ipcMain.on('confirm-sync', (event, payload) => {
    sendBackResult && sendBackResult('confirm', payload)
  })

  async function closeWindow() {
    await sessionWindow?.close()
  }

  //   const cleanup = () => {
  //     ipcMain.removeHandler(channels.getState)
  //   }
  //   sessionWindow.on('closed', cleanup)
  sessionWindow.once('ready-to-show', () => {
    sessionWindow.show()
  })

  loadRendererPage(sessionWindow, 'sync-session')
    .catch((error) => {
    //   if (!isClosing)
    //     console.error(error)
    })
  if (process.env.DEBUG_ELECTRON === '1')
    sessionWindow.webContents.openDevTools({ mode: 'detach' })

  //   function publish(nextState) {
  //     state = {
  //       ...state,
  //       ...nextState,
  //     }

  //     if (!progressWindow.isDestroyed())
  //       progressWindow.webContents.send(channels.update, state)
  //   }
  return {
    onEventHandler,
    reviewDiffInWindow,
    closeWindow,
  }
}
