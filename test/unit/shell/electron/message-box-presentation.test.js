import assert from 'node:assert/strict'
import test from 'node:test'
import en from '#frontend/i18n/locales/en/index.js'
import {
  resolveMessageBoxIconClass,
  resolveMessageBoxPresentation,
} from '#frontend/surfaces/message-box/MessageBox.presentation.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/contracts/operation-report.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_OPERATION,
} from '#src/app/contracts/server.js'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
const translate = {
  t: (...args) => i18n.global.t(...args),
  te: (...args) => i18n.global.te(...args),
}

function resolve(state) {
  return resolveMessageBoxPresentation(state, translate)
}

test('message-box presentation resolves a complete key and interpolation', () => {
  assert.deepEqual(resolve({
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
    params: { serverName: 'synology' },
  }), {
    title: 'Delete Server',
    message: 'Delete server "synology"?',
    detail: 'This removes the rclone remote from the local rclone configuration.',
  })
})

test('message-box presentation resolves string and object locale entries', () => {
  assert.deepEqual(resolve({
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: `operations.${SERVER_OPERATION.CREATE}.steps.${SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION}`,
  }), {
    title: 'Creating Server',
    message: 'Testing the server connection...',
    detail: '',
  })

  assert.deepEqual(resolve({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.SUCCESS,
    key: `operations.${SERVER_OPERATION.CREATE}.succeeded`,
  }), {
    title: 'Creating Server',
    message: 'The server was created successfully.',
    detail: '',
  })
})

test('message-box presentation uses generic fallbacks without interpreting key prefixes', () => {
  assert.deepEqual(resolve({
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: 'anything.missing',
  }), {
    title: 'Working',
    message: 'Working...',
    detail: '',
  })

  assert.deepEqual(resolve({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: 'anything.missing',
  }), {
    title: 'Error',
    message: 'Something went wrong.',
    detail: '',
  })
})

test('message-box presentation inherits a title from the nearest locale ancestor', () => {
  assert.equal(resolve({
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: `operations.${SERVER_OPERATION.CREATE}.steps.${SERVER_CREATE_PROGRESS_STEP.SAVE}`,
  }).title, 'Creating Server')
})

test('message-box presentation supports restricted literal text and runtime detail', () => {
  assert.deepEqual(resolve({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    text: {
      title: 'External Error',
      message: 'External text',
    },
    detail: 'External detail',
  }), {
    title: 'External Error',
    message: 'External text',
    detail: 'External detail',
  })

  assert.equal(resolve({
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
    detail: 'Runtime detail',
  }).detail, 'Runtime detail')
})

test('message-box presentation uses a neutral question icon for confirmation', () => {
  assert.match(resolveMessageBoxIconClass({
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  }), /question/)
})
