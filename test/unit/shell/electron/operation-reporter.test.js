import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import {
  OPERATION_REPORT_ACKNOWLEDGEMENT,
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/contracts/operation-report.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_OPERATION,
} from '#src/app/contracts/server.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'

const ipcHandlers = new Map()
const ipcMain = new EventEmitter()
ipcMain.handle = (channel, handler) => ipcHandlers.set(channel, handler)
ipcMain.removeHandler = channel => ipcHandlers.delete(channel)

let latestWindow = null

class FakeBrowserWindow extends EventEmitter {
  constructor() {
    super()
    this.destroyed = false
    this.sent = []
    this.webContents = new EventEmitter()
    this.webContents.send = (_channel, payload) => this.sent.push(payload)
    this.webContents.openDevTools = () => {}
    latestWindow = this
  }

  close() {
    this.destroyed = true
    this.emit('closed')
  }

  focus() {}
  isDestroyed() { return this.destroyed }
  loadFile() { return Promise.resolve() }
  loadURL() { return Promise.resolve() }
  show() {}
}

const require = createRequire(import.meta.url)
const electronModulePath = require.resolve('electron')
require.cache[electronModulePath] = {
  exports: {
    BrowserWindow: FakeBrowserWindow,
    ipcMain,
  },
}

const messageBox = await import('#electron/main/message-box/window.js')
const operationPresentation = await import('#electron/main/message-box/operation-presentation.js')

function openCreateServerProgress() {
  return createOperationReporter(SERVER_OPERATION.CREATE, {
    open: messageBox.openMessageBox,
    update: messageBox.updateMessageBox,
    close: messageBox.closeMessageBox,
  })
}

function revealMessageBox() {
  ipcMain.emit('message-box:ready')
  return latestWindow.sent.at(-1)
}

async function acknowledge(promise) {
  await ipcHandlers.get('message-box:on-click-confirm')()
  await promise
}

test('operation progress opens, updates, and succeeds without message levels while running', async () => {
  const progress = openCreateServerProgress()

  assert.deepEqual(revealMessageBox(), {
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: `operations.${SERVER_OPERATION.CREATE}`,
  })

  assert.equal('update' in progress, false)
  progress.step(SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION, { serverName: 'synology' })
  assert.deepEqual(latestWindow.sent.at(-1), {
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: `operations.${SERVER_OPERATION.CREATE}.steps.${SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION}`,
    params: { serverName: 'synology' },
  })

  const succeeded = progress.succeed(true)
  assert.deepEqual(latestWindow.sent.at(-1), {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.SUCCESS,
    key: `operations.${SERVER_OPERATION.CREATE}.succeeded`,
  })
  await acknowledge(succeeded)
})

test('operation progress closes immediately for unacknowledged success', async () => {
  const progress = openCreateServerProgress()
  revealMessageBox()

  await progress.succeed(false)
  assert.equal(latestWindow.destroyed, true)
})

test('operation progress presents application and unexpected errors with error severity', async () => {
  const expectedProgress = openCreateServerProgress()
  revealMessageBox()
  const expected = expectedProgress.error(new AppError({
    code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
    message: 'Connection failed.',
    detail: 'Authentication rejected.',
  }))

  assert.deepEqual(latestWindow.sent.at(-1), {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${APP_ERROR_CODE.SERVER_CONNECTION_FAILED}`,
    params: {},
    detail: 'Authentication rejected.',
  })
  await acknowledge(expected)

  const unexpectedProgress = openCreateServerProgress()
  revealMessageBox()
  const unexpected = unexpectedProgress.error(new Error('Socket closed.'))

  assert.deepEqual(latestWindow.sent.at(-1), {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${APP_ERROR_CODE.UNKNOWN}`,
    params: {},
    detail: 'Socket closed.',
  })
  await acknowledge(unexpected)
})

test('operation progress exposes explicit close behavior', async () => {
  const progress = openCreateServerProgress()
  revealMessageBox()

  await progress.close(OPERATION_REPORT_ACKNOWLEDGEMENT.CANCELLED)

  assert.equal(latestWindow.destroyed, true)
})

test('Electron operation presentation returns a successful OperationResult', async () => {
  let finishOperation
  const operationFinished = new Promise((resolve) => {
    finishOperation = resolve
  })
  const pending = operationPresentation.runReportedOperation(
    SERVER_OPERATION.CREATE,
    async (onProgress) => {
      onProgress(SERVER_CREATE_PROGRESS_STEP.SAVE)
      await operationFinished
      return { name: 'synology' }
    },
  )

  assert.deepEqual(revealMessageBox(), {
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: `operations.${SERVER_OPERATION.CREATE}.steps.${SERVER_CREATE_PROGRESS_STEP.SAVE}`,
    params: {},
  })

  finishOperation()
  await new Promise(resolve => setImmediate(resolve))
  await acknowledge(pending)

  assert.deepEqual(await pending, {
    success: true,
    value: { name: 'synology' },
  })
})

test('Electron request error presentation returns a failed OperationResult', async () => {
  const error = new AppError({
    code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
    message: 'Connection failed.',
  })
  const pending = operationPresentation.reportRequestError(error)

  assert.deepEqual(revealMessageBox(), {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${APP_ERROR_CODE.SERVER_CONNECTION_FAILED}`,
    params: {},
    detail: 'Connection failed.',
  })

  await acknowledge(pending)
  assert.deepEqual(await pending, {
    success: false,
    error: {
      code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
      message: 'Connection failed.',
      detail: undefined,
      fields: undefined,
      meta: undefined,
    },
  })
})
