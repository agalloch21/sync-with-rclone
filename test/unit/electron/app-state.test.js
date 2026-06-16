import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  clearActiveModalWindow,
  getAppModel,
  getMessageBoxParentWindow,
  refreshAppModel,
  resetAppStateForTest,
  setActiveModalWindow,
  setAppModelLoaderForTest,
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
  resetAppStateForTest()
})

test('getAppModel loads once and returns cached app model', async () => {
  let calls = 0
  setAppModelLoaderForTest(async () => {
    calls += 1
    return { syncTasks: [{ name: 'Projects' }] }
  })

  assert.deepEqual(await getAppModel(), {
    success: true,
    model: { syncTasks: [{ name: 'Projects' }] },
  })
  assert.deepEqual(await getAppModel(), {
    success: true,
    model: { syncTasks: [{ name: 'Projects' }] },
  })
  assert.equal(calls, 1)
})

test('refreshAppModel replaces cached app model', async () => {
  let calls = 0
  setAppModelLoaderForTest(async () => {
    calls += 1
    return { version: calls }
  })

  assert.deepEqual(await getAppModel(), { success: true, model: { version: 1 } })
  assert.deepEqual(await refreshAppModel(), { success: true, model: { version: 2 } })
  assert.deepEqual(await getAppModel(), { success: true, model: { version: 2 } })
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
