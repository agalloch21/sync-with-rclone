import assert from 'node:assert/strict'
import test from 'node:test'
import { reactive } from 'vue'
import { useServerOperations } from '#src/electron/renderer/src/composables/useServerOperations.js'

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
