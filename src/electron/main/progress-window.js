import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const progressEntryPath = path.join(__dirname, '../renderer/dist/progress.html')
const MIN_PROGRESS_WINDOW_VISIBLE_MS = 600

function summarizePhase(phase) {
  if (!phase)
    return ''

  return `${phase.type.toUpperCase()} ${phase.paths.length} item(s)`
}

export function createProgressWindowController() {
  const { BrowserWindow, ipcMain } = require('electron')
  const channelPrefix = `sync-progress:${Date.now()}:${Math.random().toString(16).slice(2)}`
  const channels = {
    getState: `${channelPrefix}:get-state`,
    update: `${channelPrefix}:update`,
  }

  let state = {
    status: 'idle',
    title: 'Sync In Progress',
    detail: 'Preparing execution...',
    phaseCount: 0,
    completedPhaseCount: 0,
    currentPhaseLabel: '',
  }
  let isClosing = false
  const createdAtMs = Date.now()

  const progressWindow = new BrowserWindow({
    width: 560,
    height: 320,
    minWidth: 500,
    minHeight: 280,
    autoHideMenuBar: true,
    show: false,
    title: 'Sync Progress',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/progress-preload.cjs'),
      additionalArguments: [JSON.stringify(channels)],
    },
  })

  const cleanup = () => {
    ipcMain.removeHandler(channels.getState)
  }

  ipcMain.handle(channels.getState, async () => state)

  progressWindow.on('closed', cleanup)
  progressWindow.once('ready-to-show', () => {
    progressWindow.show()
  })

  progressWindow.loadFile(progressEntryPath)
    .catch((error) => {
      if (!isClosing)
        console.error(error)
    })

  function publish(nextState) {
    state = {
      ...state,
      ...nextState,
    }

    if (!progressWindow.isDestroyed())
      progressWindow.webContents.send(channels.update, state)
  }

  return {
    handleEvent(event) {
      if (event.type === 'start') {
        publish({
          status: 'running',
          title: 'Sync In Progress',
          detail: `Executing ${event.execution.phases.length} phase(s)...`,
          phaseCount: event.execution.phases.length,
          completedPhaseCount: 0,
          currentPhaseLabel: '',
        })
        return
      }

      if (event.type === 'phase-start') {
        publish({
          status: 'running',
          detail: `Running phase ${event.phaseIndex + 1} of ${event.phaseCount}`,
          currentPhaseLabel: summarizePhase(event.phase),
        })
        return
      }

      if (event.type === 'phase-complete') {
        publish({
          status: 'running',
          detail: `Completed phase ${event.phaseIndex + 1} of ${event.phaseCount}`,
          completedPhaseCount: event.phaseIndex + 1,
          currentPhaseLabel: summarizePhase(event.phase),
        })
        return
      }

      if (event.type === 'complete') {
        publish({
          status: 'success',
          title: 'Sync Completed',
          detail: `Finished ${event.execution.phases.length} phase(s).`,
          completedPhaseCount: event.execution.phases.length,
          currentPhaseLabel: 'All phases complete',
        })
        return
      }

      if (event.type === 'cancel') {
        publish({
          status: 'cancel',
          title: 'Sync Cancelled',
          detail: 'No apply operations were executed.',
          currentPhaseLabel: '',
        })
        return
      }

      if (event.type === 'error') {
        publish({
          status: 'error',
          title: 'Sync Failed',
          detail: event.message,
          currentPhaseLabel: '',
        })
      }
    },
    async close() {
      isClosing = true
      const remainingMs = Math.max(0, MIN_PROGRESS_WINDOW_VISIBLE_MS - (Date.now() - createdAtMs))
      if (remainingMs > 0)
        await new Promise(resolve => setTimeout(resolve, remainingMs))

      if (!progressWindow.isDestroyed())
        progressWindow.close()
    },
  }
}
