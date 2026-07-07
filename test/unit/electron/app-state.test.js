import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  clearActiveModalWindow,
  clearMainWindow,
  getMessageBoxParentWindow,
  setActiveModalWindow,
  setMainWindow,
} from '#src/electron/main/app-state.js'

function createWindowStub() {
  let destroyed = false
  return {
    destroy() {
      destroyed = true
    },
    isDestroyed() {
      return destroyed
    },
  }
}

afterEach(() => {
  clearActiveModalWindow()
  clearMainWindow()
})

test('getMessageBoxParentWindow prefers active modal over main window', () => {
  const mainWindow = createWindowStub()
  const modalWindow = createWindowStub()

  setMainWindow(mainWindow)
  assert.equal(getMessageBoxParentWindow(), mainWindow)

  setActiveModalWindow(modalWindow)
  assert.equal(getMessageBoxParentWindow(), modalWindow)
})

test('clearing or destroying active modal falls back to main window', () => {
  const mainWindow = createWindowStub()
  const modalWindow = createWindowStub()

  setMainWindow(mainWindow)
  setActiveModalWindow(modalWindow)
  clearActiveModalWindow(modalWindow)
  assert.equal(getMessageBoxParentWindow(), mainWindow)

  setActiveModalWindow(modalWindow)
  modalWindow.destroy()
  assert.equal(getMessageBoxParentWindow(), mainWindow)
})
