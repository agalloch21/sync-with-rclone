import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/operations/operation-report-contract.js'
import { useMessageBox } from '#src/electron/renderer/src/composables/useMessageBox.js'

function createMessageBox() {
  const payloads = []
  const messageBox = useMessageBox({
    async showMessageBox(payload) {
      payloads.push(payload)
      return { success: true }
    },
  })
  return { messageBox, payloads }
}

test('message facade exposes semantic level methods over message content', async () => {
  const { messageBox, payloads } = createMessageBox()

  await messageBox.information(APP_MESSAGE_CODE.SERVER_NAME_INVALID)
  await messageBox.warning(APP_MESSAGE_CODE.SERVER_NAME_INVALID, {
    params: { serverName: 'synology' },
  })
  await messageBox.success(APP_MESSAGE_CODE.SERVER_NAME_INVALID)

  assert.deepEqual(payloads, [
    {
      mode: OPERATION_REPORT_MODE.MESSAGE,
      level: OPERATION_REPORT_LEVEL.INFO,
      key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
    },
    {
      mode: OPERATION_REPORT_MODE.MESSAGE,
      level: OPERATION_REPORT_LEVEL.WARNING,
      key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
      params: { serverName: 'synology' },
    },
    {
      mode: OPERATION_REPORT_MODE.MESSAGE,
      level: OPERATION_REPORT_LEVEL.SUCCESS,
      key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
    },
  ])
})

test('message facade emits neutral confirmation without a level', async () => {
  const { messageBox, payloads } = createMessageBox()

  await messageBox.confirm(APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION, {
    params: { serverName: 'synology' },
  })

  assert.deepEqual(payloads[0], {
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
    params: { serverName: 'synology' },
  })
})

test('message facade normalizes application and unexpected errors as errors', async () => {
  const { messageBox, payloads } = createMessageBox()
  const expected = new AppError({
    code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
    message: 'Connection failed.',
    meta: { serverName: 'synology' },
  })

  await messageBox.error(expected)
  await messageBox.error(new Error('Socket closed.'))

  assert.deepEqual(payloads[0], {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${APP_ERROR_CODE.SERVER_CONNECTION_FAILED}`,
    params: { serverName: 'synology' },
    detail: 'Connection failed.',
  })
  assert.deepEqual(payloads[1], {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${APP_ERROR_CODE.UNKNOWN}`,
    params: {},
    detail: 'Socket closed.',
  })
})
