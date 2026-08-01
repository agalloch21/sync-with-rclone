import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  isOperationReportAcknowledgement,
  isOperationReportState,
  normalizeOperationReportState,
  OPERATION_REPORT_ACKNOWLEDGEMENT,
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/contracts/operation-report.js'

test('operation report acknowledgement validator accepts lifecycle outcomes', () => {
  for (const acknowledgement of Object.values(OPERATION_REPORT_ACKNOWLEDGEMENT))
    assert.equal(isOperationReportAcknowledgement(acknowledgement), true)

  assert.equal(isOperationReportAcknowledgement('succeeded'), false)
})

test('operation report state validator accepts keyed and literal states', () => {
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.WARNING,
    key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
    params: { serverName: 'synology' },
  }), true)

  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  }), true)

  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: 'operations.createServer.steps.save',
  }), true)

  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    text: {
      title: 'External Error',
      message: 'An external tool failed.',
    },
    detail: 'Exit code 1.',
  }), true)
})

test('operation report state validator rejects malformed and non-serializable states', () => {
  const circular = {}
  circular.self = circular

  assert.equal(isOperationReportState(null), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    key: 'messages.example',
    text: { message: 'Example' },
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    key: '',
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    text: { title: 'Missing message' },
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    text: { message: 'Literal' },
    params: { name: 'unused' },
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    key: 'messages.example',
    params: { callback() {} },
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    key: 'messages.example',
    params: circular,
  }), false)
  assert.equal(isOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    key: 'messages.example',
    params: { createdAt: new Date() },
  }), false)
})

test('operation report state normalization supplies defaults and validates mode-specific levels', () => {
  assert.deepEqual(normalizeOperationReportState({
    key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
  }), {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
    key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
  })

  assert.deepEqual(normalizeOperationReportState({
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  }), {
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  })

  assert.deepEqual(normalizeOperationReportState({
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: 'operations.createServer',
  }), {
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: 'operations.createServer',
  })

  assert.throws(() => normalizeOperationReportState({
    mode: 'sheet',
    key: 'messages.example',
  }), /Invalid operation report mode/)
  assert.throws(() => normalizeOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: 'fatal',
    key: 'messages.example',
  }), /Invalid operation report state/)
  assert.throws(() => normalizeOperationReportState({
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.INFO,
  }), /Invalid operation report state/)
  assert.throws(() => normalizeOperationReportState({
    mode: OPERATION_REPORT_MODE.CONFIRM,
    level: OPERATION_REPORT_LEVEL.WARNING,
    key: 'messages.example',
  }), /level is not valid/)
})
