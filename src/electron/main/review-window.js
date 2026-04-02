import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serializeDiffSnapshot } from '#src/core/serialize-diff-snapshot.js'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const reviewEntryPath = path.join(__dirname, '../renderer/dist/index.html')

export async function reviewDiffInWindow(diffSnapshot) {
  const { BrowserWindow, ipcMain } = require('electron')
  const payload = serializeDiffSnapshot(diffSnapshot)
  const channelPrefix = `sync-review:${Date.now()}:${Math.random().toString(16).slice(2)}`
  const channels = {
    getPayload: `${channelPrefix}:get-payload`,
    submit: `${channelPrefix}:submit`,
    cancel: `${channelPrefix}:cancel`,
  }

  return await new Promise((resolve, reject) => {
    let settled = false
    const reviewWindow = new BrowserWindow({
      width: 1120,
      height: 780,
      minWidth: 820,
      minHeight: 560,
      autoHideMenuBar: true,
      show: false,
      title: 'Sync Review',
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/review-preload.cjs'),
        additionalArguments: [JSON.stringify(channels)],
      },
    })

    reviewWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    })

    reviewWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
      console.error(`Renderer failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
    })

    reviewWindow.webContents.on('render-process-gone', (_, details) => {
      console.error(`Renderer process gone: ${details.reason}`)
    })

    const cleanup = () => {
      ipcMain.removeHandler(channels.getPayload)
      ipcMain.removeHandler(channels.submit)
      ipcMain.removeHandler(channels.cancel)
    }

    ipcMain.handle(channels.getPayload, async () => payload)

    ipcMain.handle(channels.submit, async (_, result) => {
      if (settled)
        return
      settled = true
      cleanup()
      resolve(result)
      reviewWindow.close()
    })

    ipcMain.handle(channels.cancel, async () => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(new Error('Diff review cancelled by user'))
      reviewWindow.close()
    })

    reviewWindow.once('ready-to-show', () => {
      reviewWindow.show()
    })

    reviewWindow.on('closed', () => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(new Error('Diff review window closed before confirmation'))
    })

    reviewWindow.loadFile(reviewEntryPath)
      .catch((error) => {
        if (settled)
          return
        settled = true
        cleanup()
        reject(error)
      })

    if (process.env.DEBUG_ELECTRON === '1')
      reviewWindow.webContents.openDevTools({ mode: 'detach' })
  })
}
