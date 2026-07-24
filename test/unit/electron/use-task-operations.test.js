import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { formatIgnorePatterns, parseIgnorePatterns, useTaskOperations } from '#src/electron/renderer/src/composables/useTaskOperations.js'

function createPreload(overrides = {}) {
  return {
    showMessageBox: async () => ({ success: true }),
    ...overrides,
  }
}

test('parseIgnorePatterns accepts commas and line breaks as separators', () => {
  assert.deepEqual(parseIgnorePatterns('node_modules/, .DS_Store\n*.tmp\r\n.git/'), [
    'node_modules/',
    '.DS_Store',
    '*.tmp',
    '.git/',
  ])
})

test('parseIgnorePatterns trims entries, removes blanks, and preserves duplicates', () => {
  assert.deepEqual(parseIgnorePatterns('  *.tmp  ,,\n*.tmp, \r\n'), ['*.tmp', '*.tmp'])
  assert.deepEqual(parseIgnorePatterns(''), [])
})

test('formatIgnorePatterns displays patterns as comma-separated lines', () => {
  assert.equal(formatIgnorePatterns(['.DS_Store', 'node_modules/']), '.DS_Store,\nnode_modules/')
  assert.equal(formatIgnorePatterns([]), '')
})

test('selectLocalFolder sends the current path through the task operations composable', async () => {
  let receivedPayload = null
  const operations = useTaskOperations(createPreload({
    selectLocalFolder: async (payload) => {
      receivedPayload = payload
      return { success: true, value: '/selected' }
    },
  }))

  const result = await operations.selectLocalFolder('/current')
  assert.deepEqual(receivedPayload, { currentPath: '/current' })
  assert.deepEqual(result, { success: true, value: '/selected' })
})

test('selectRemoteFolder sends the server and current path through the task operations composable', async () => {
  let receivedPayload = null
  const operations = useTaskOperations(createPreload({
    selectRemoteFolder: async (payload) => {
      receivedPayload = payload
      return { success: true, value: 'Projects' }
    },
  }))

  const result = await operations.selectRemoteFolder('synology', 'Current')
  assert.deepEqual(receivedPayload, { serverName: 'synology', currentPath: 'Current' })
  assert.deepEqual(result, { success: true, value: 'Projects' })
})

test('createSyncTask and updateSyncTask send plain task payloads', async () => {
  const payloads = []
  const operations = useTaskOperations(createPreload({
    createSyncTask: async (payload) => {
      payloads.push(payload)
      return { success: true }
    },
    updateSyncTask: async (payload) => {
      payloads.push(payload)
      return { success: true }
    },
  }))
  const task = { rcloneRemote: 'synology', localBasePath: '/local', remoteBasePath: 'Projects' }

  await operations.createSyncTask(task)
  await operations.updateSyncTask(task, { ...task, remoteBasePath: 'Next' })

  assert.deepEqual(payloads, [
    { task },
    { task, expectedTask: { ...task, remoteBasePath: 'Next' } },
  ])
})

test('updateSyncTaskIgnorePatterns sends a dedicated plain payload', async () => {
  let receivedPayload = null
  const operations = useTaskOperations(createPreload({
    updateSyncTaskIgnorePatterns: async (payload) => {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
  }))
  const task = {
    rcloneRemote: 'synology',
    localBasePath: '/local',
    remoteBasePath: 'Projects',
    ignorePatterns: ['old'],
  }

  const result = await operations.updateSyncTaskIgnorePatterns(task, ['node_modules/', '*.tmp'])

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    task,
    ignorePatterns: ['node_modules/', '*.tmp'],
  })
})

test('updateGlobalIgnorePatterns sends a dedicated plain payload', async () => {
  let receivedPayload = null
  const operations = useTaskOperations(createPreload({
    updateGlobalIgnorePatterns: async (payload) => {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true, value: payload.ignorePatterns }
    },
  }))

  const result = await operations.updateGlobalIgnorePatterns(['.DS_Store', '*.tmp'])

  assert.deepEqual(result, { success: true, value: ['.DS_Store', '*.tmp'] })
  assert.deepEqual(receivedPayload, {
    ignorePatterns: ['.DS_Store', '*.tmp'],
  })
})

test('createSyncTask validates the mapping before invoking preload', async () => {
  let createWasCalled = false
  const messages = []
  const operations = useTaskOperations(createPreload({
    createSyncTask: async () => {
      createWasCalled = true
      return { success: true }
    },
    showMessageBox: async (payload) => {
      messages.push(payload)
      return { success: true }
    },
  }))

  const result = await operations.createSyncTask({
    rcloneRemote: 'synology',
    localBasePath: '',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, false)
  assert.equal(createWasCalled, false)
  assert.equal(messages[0].key, `messages.${APP_MESSAGE_CODE.SYNC_TASK_LOCAL_FOLDER_REQUIRED}`)
})

test('updateSyncTask validates the task reference before invoking preload', async () => {
  let updateWasCalled = false
  const messages = []
  const operations = useTaskOperations(createPreload({
    updateSyncTask: async () => {
      updateWasCalled = true
      return { success: true }
    },
    showMessageBox: async (payload) => {
      messages.push(payload)
      return { success: true }
    },
  }))

  const result = await operations.updateSyncTask(null, {
    rcloneRemote: 'synology',
    localBasePath: '/local',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, false)
  assert.equal(updateWasCalled, false)
  assert.equal(messages[0].key, `messages.${APP_MESSAGE_CODE.SYNC_TASK_REQUIRED}`)
})

test('deleteSyncTask skips deletion when confirmation is cancelled', async () => {
  let deleteWasCalled = false
  const operations = useTaskOperations(createPreload({
    deleteSyncTask: async () => {
      deleteWasCalled = true
      return { success: true }
    },
    showMessageBox: async () => ({ success: true, value: 'cancelled' }),
  }))

  const result = await operations.deleteSyncTask({
    displayName: 'Project',
    rcloneRemote: 'synology',
    localBasePath: '/local',
  })

  assert.deepEqual(result, { success: true, value: 'cancelled' })
  assert.equal(deleteWasCalled, false)
})

test('deleteSyncTask sends its stable reference after confirmation', async () => {
  let receivedPayload = null
  let confirmationPayload = null
  const operations = useTaskOperations(createPreload({
    deleteSyncTask: async (payload) => {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
    showMessageBox: async (payload) => {
      confirmationPayload = payload
      return { success: true, value: 'confirmed' }
    },
  }))

  const result = await operations.deleteSyncTask({
    displayName: 'Project',
    rcloneRemote: 'synology',
    localBasePath: '/local',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    task: {
      rcloneRemote: 'synology',
      localBasePath: '/local',
    },
  })
  assert.deepEqual(confirmationPayload, {
    mode: 'confirm',
    key: `messages.${APP_MESSAGE_CODE.SYNC_TASK_DELETE_CONFIRMATION}`,
    params: { taskLabel: 'Project' },
  })
  assert.equal(Object.hasOwn(confirmationPayload, 'level'), false)
})
