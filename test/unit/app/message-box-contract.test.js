import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  isMessageBoxState,
  MESSAGE_BOX_LEVEL,
  MESSAGE_BOX_MODE,
  normalizeMessageBoxState,
} from '#src/app/main-window/message-box-contract.js'

test('message-box state validator accepts keyed and literal states', () => {
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.WARNING,
    key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
    params: { serverName: 'synology' },
  }), true)

  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  }), true)

  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.PROGRESS,
    key: 'operations.createServer.steps.save',
  }), true)

  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.ERROR,
    text: {
      title: 'External Error',
      message: 'An external tool failed.',
    },
    detail: 'Exit code 1.',
  }), true)
})

test('message-box state validator rejects malformed and non-serializable states', () => {
  const circular = {}
  circular.self = circular

  assert.equal(isMessageBoxState(null), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    key: 'messages.example',
    text: { message: 'Example' },
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    key: '',
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    text: { title: 'Missing message' },
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    text: { message: 'Literal' },
    params: { name: 'unused' },
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    key: 'messages.example',
    params: { callback() {} },
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    key: 'messages.example',
    params: circular,
  }), false)
  assert.equal(isMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    key: 'messages.example',
    params: { createdAt: new Date() },
  }), false)
})

test('message-box state normalization supplies defaults and validates mode-specific levels', () => {
  assert.deepEqual(normalizeMessageBoxState({
    key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
  }), {
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
    key: `messages.${APP_MESSAGE_CODE.SERVER_NAME_INVALID}`,
  })

  assert.deepEqual(normalizeMessageBoxState({
    mode: MESSAGE_BOX_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  }), {
    mode: MESSAGE_BOX_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
  })

  assert.deepEqual(normalizeMessageBoxState({
    mode: MESSAGE_BOX_MODE.PROGRESS,
    key: 'operations.createServer',
  }), {
    mode: MESSAGE_BOX_MODE.PROGRESS,
    key: 'operations.createServer',
  })

  assert.throws(() => normalizeMessageBoxState({
    mode: 'sheet',
    key: 'messages.example',
  }), /Invalid message-box mode/)
  assert.throws(() => normalizeMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: 'fatal',
    key: 'messages.example',
  }), /Invalid message-box state/)
  assert.throws(() => normalizeMessageBoxState({
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.INFO,
  }), /Invalid message-box state/)
  assert.throws(() => normalizeMessageBoxState({
    mode: MESSAGE_BOX_MODE.CONFIRM,
    level: MESSAGE_BOX_LEVEL.WARNING,
    key: 'messages.example',
  }), /level is not valid/)
})
