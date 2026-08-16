import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  clearActiveModalWindow,
  clearMainWindow,
  clearMessageBoxWindow,
  getMessageBoxParentWindow,
  getMessageBoxWindow,
  setActiveModalWindow,
  setMainWindow,
  setMessageBoxWindow,
} from '#electron/main/app-state.js'

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
  clearMessageBoxWindow()
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

test('message box window is tracked separately from its parent window', () => {
  const mainWindow = createWindowStub()
  const messageBoxWindow = createWindowStub()

  setMainWindow(mainWindow)
  setMessageBoxWindow(messageBoxWindow)

  assert.equal(getMessageBoxParentWindow(), mainWindow)
  assert.equal(getMessageBoxWindow(), messageBoxWindow)

  messageBoxWindow.destroy()
  assert.equal(getMessageBoxWindow(), null)
})
