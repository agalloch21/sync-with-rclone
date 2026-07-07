// Electron main-process runtime state only. Do not put app/domain mutations here.
let mainWindow = null
let activeModalWindow = null

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
