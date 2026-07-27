import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/operations/operation-report-contract.js'
import { useServerOperations } from '#src/electron/renderer/src/composables/useServerOperations.js'
import { reactive } from 'vue'

test('createServer sends plain protocol fields through preload', async () => {
  let receivedPayload = null
  const serverOperations = useServerOperations({
    async createServer(payload) {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
    async showMessageBox() {},
  })

  const result = await serverOperations.createServer('synology', 'sftp', reactive({
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  }))

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    expectedServerName: 'synology',
    protocolType: 'sftp',
    protocolFields: {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    },
  })
})

test('createServer does not present a failure already handled by the main process', async () => {
  let messageShown = false
  const serverOperations = useServerOperations({
    async createServer() {
      return {
        success: false,
        error: {
          message: 'Server connection failed.',
          detail: 'Connection refused.',
        },
      }
    },
    async showMessageBox() {
      messageShown = true
    },
  })

  const result = await serverOperations.createServer('synology', 'sftp', {
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  })

  assert.equal(result.success, false)
  assert.equal(messageShown, false)
})

test('createServer presents an IPC rejection because main-process handling did not complete', async () => {
  const messages = []
  const serverOperations = useServerOperations({
    async createServer() {
      throw new Error('IPC unavailable')
    },
    async showMessageBox(payload) {
      messages.push(payload)
    },
  })

  const result = await serverOperations.createServer('synology', 'sftp', {
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  })

  assert.equal(result.success, false)
  assert.equal(messages.at(-1).mode, OPERATION_REPORT_MODE.MESSAGE)
  assert.equal(messages.at(-1).level, OPERATION_REPORT_LEVEL.ERROR)
  assert.deepEqual(messages.at(-1), {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${APP_ERROR_CODE.IPC_UNAVAILABLE}`,
    params: {},
    detail: 'IPC unavailable',
  })
})

test('createServer does not open progress UI when validation fails', async () => {
  let progressOpened = false
  const serverOperations = useServerOperations({
    async showMessageBox(payload) {
      if (payload.mode === OPERATION_REPORT_MODE.PROGRESS)
        progressOpened = true
    },
  })

  const result = await serverOperations.createServer('', 'sftp', {})

  assert.equal(result.success, false)
  assert.equal(progressOpened, false)
})

test('updateServer sends plain protocol fields through preload', async () => {
  let receivedPayload = null
  const serverOperations = useServerOperations({
    async updateServer(payload) {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
    async showMessageBox() {},
  })

  const result = await serverOperations.updateServer('synology', 'nas', 'sftp', reactive({
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  }))

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    serverName: 'synology',
    expectedServerName: 'nas',
    protocolType: 'sftp',
    protocolFields: {
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    },
  })
})

test('updateServer does not present a failure already handled by the main process', async () => {
  let messageShown = false
  const serverOperations = useServerOperations({
    async updateServer() {
      return {
        success: false,
        error: {
          code: APP_ERROR_CODE.SERVER_OPERATION_FAILED,
          message: 'Server update failed.',
        },
      }
    },
    async showMessageBox() {
      messageShown = true
    },
  })

  const result = await serverOperations.updateServer('synology', 'synology', 'sftp', {
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: 'secret',
  })

  assert.equal(result.success, false)
  assert.equal(messageShown, false)
})

test('deleteServer skips deletion when confirmation is cancelled', async () => {
  let deleteCalled = false
  const serverOperations = useServerOperations({
    async deleteServer() {
      deleteCalled = true
      return { success: true }
    },
    async showMessageBox() {
      return {
        success: true,
        value: 'cancelled',
      }
    },
  })

  const result = await serverOperations.deleteServer('synology')

  assert.equal(result.success, true)
  assert.equal(result.value, 'cancelled')
  assert.equal(deleteCalled, false)
})

test('deleteServer sends payload after confirmation', async () => {
  let receivedPayload = null
  let confirmationPayload = null
  const serverOperations = useServerOperations({
    async deleteServer(payload) {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
    async showMessageBox(payload) {
      confirmationPayload = payload
      return {
        success: true,
        value: 'confirmed',
      }
    },
  })

  const result = await serverOperations.deleteServer('synology')

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    serverName: 'synology',
  })
  assert.deepEqual(confirmationPayload, {
    mode: OPERATION_REPORT_MODE.CONFIRM,
    key: `messages.${APP_MESSAGE_CODE.SERVER_DELETE_CONFIRMATION}`,
    params: { serverName: 'synology' },
  })
  assert.equal(Object.hasOwn(confirmationPayload, 'level'), false)
})
