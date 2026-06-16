import { loadAppModel as defaultLoadAppModel } from '#src/app/app-model.js'

// Electron main-process runtime state only. Do not put app/domain mutations here.
let mainWindow = null
let activeModalWindow = null
let appModel = null
let appModelError = null
let loadAppModel = defaultLoadAppModel

function isUsableWindow(window) {
  return window && !window.isDestroyed?.()
}

export function setMainWindow(window) {
  mainWindow = window || null
}

export function getMainWindow() {
  return isUsableWindow(mainWindow) ? mainWindow : null
}

export function clearMainWindow(window = mainWindow) {
  if (!window || window === mainWindow)
    mainWindow = null
}

export function setActiveModalWindow(window) {
  activeModalWindow = window || null
}

export function getActiveModalWindow() {
  return isUsableWindow(activeModalWindow) ? activeModalWindow : null
}

export function clearActiveModalWindow(window = activeModalWindow) {
  if (!window || window === activeModalWindow)
    activeModalWindow = null
}

export function getMessageBoxParentWindow() {
  return getActiveModalWindow() || getMainWindow()
}

export async function refreshAppModel() {
  try {
    appModel = await loadAppModel()
    appModelError = null
    return { success: true, model: appModel }
  }
  catch (error) {
    appModelError = error?.message || 'Failed to load app model.'
    return { success: false, error: appModelError }
  }
}

export async function getAppModel() {
  if (!appModel && !appModelError)
    return refreshAppModel()

  if (appModel)
    return { success: true, model: appModel }

  return { success: false, error: appModelError }
}

export function getCachedAppModelResult() {
  if (appModel)
    return { success: true, model: appModel }

  if (appModelError)
    return { success: false, error: appModelError }

  return null
}

export function setAppModelLoaderForTest(loader) {
  loadAppModel = loader || defaultLoadAppModel
  appModel = null
  appModelError = null
}

export function resetAppStateForTest() {
  mainWindow = null
  activeModalWindow = null
  appModel = null
  appModelError = null
  loadAppModel = defaultLoadAppModel
}
