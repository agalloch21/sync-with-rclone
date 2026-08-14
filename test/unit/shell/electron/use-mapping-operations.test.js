import assert from 'node:assert/strict'
import test from 'node:test'
import { formatExclusionPatterns, parseExclusionPatterns, useMappingOperations } from '#frontend/composables/useMappingOperations.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'

function createPreload(overrides = {}) {
  return {
    showMessageBox: async () => ({ success: true }),
    ...overrides,
  }
}

test('parseExclusionPatterns accepts commas and line breaks as separators', () => {
  assert.deepEqual(parseExclusionPatterns('node_modules/, .DS_Store\n*.tmp\r\n.git/'), [
    'node_modules/',
    '.DS_Store',
    '*.tmp',
    '.git/',
  ])
})

test('parseExclusionPatterns trims entries, removes blanks, and preserves duplicates', () => {
  assert.deepEqual(parseExclusionPatterns('  *.tmp  ,,\n*.tmp, \r\n'), ['*.tmp', '*.tmp'])
  assert.deepEqual(parseExclusionPatterns(''), [])
})

test('formatExclusionPatterns displays patterns as comma-separated lines', () => {
  assert.equal(formatExclusionPatterns(['.DS_Store', 'node_modules/']), '.DS_Store,\nnode_modules/')
  assert.equal(formatExclusionPatterns([]), '')
})

test('selectLocalFolder sends the current path through the mapping operations composable', async () => {
  let receivedPayload = null
  const operations = useMappingOperations(createPreload({
    selectLocalFolder: async (payload) => {
      receivedPayload = payload
      return { success: true, value: '/selected' }
    },
  }))

  const result = await operations.selectLocalFolder('/current')
  assert.deepEqual(receivedPayload, { currentPath: '/current' })
  assert.deepEqual(result, { success: true, value: '/selected' })
})

test('selectRemoteFolder sends the server and current path through the mapping operations composable', async () => {
  let receivedPayload = null
  const operations = useMappingOperations(createPreload({
    selectRemoteFolder: async (payload) => {
      receivedPayload = payload
      return { success: true, value: 'Projects' }
    },
  }))

  const result = await operations.selectRemoteFolder('synology', 'Current')
  assert.deepEqual(receivedPayload, { serverName: 'synology', currentPath: 'Current' })
  assert.deepEqual(result, { success: true, value: 'Projects' })
})

test('createMapping and updateMapping send plain mapping payloads', async () => {
  const payloads = []
  const operations = useMappingOperations(createPreload({
    createMapping: async (payload) => {
      payloads.push(payload)
      return { success: true }
    },
    updateMapping: async (payload) => {
      payloads.push(payload)
      return { success: true }
    },
  }))
  const mapping = { rcloneRemote: 'synology', localBasePath: '/local', remoteBasePath: 'Projects' }

  await operations.createMapping(mapping)
  await operations.updateMapping(mapping, { ...mapping, remoteBasePath: 'Next' })

  assert.deepEqual(payloads, [
    { mapping },
    { mapping, expectedMapping: { ...mapping, remoteBasePath: 'Next' } },
  ])
})

test('mapping mutations do not present failures already handled by the main process', async () => {
  let messageShown = false
  const operations = useMappingOperations(createPreload({
    createMapping: async () => ({
      success: false,
      error: {
        code: 'mapping.already_exists',
        message: 'Mapping already exists.',
      },
    }),
    showMessageBox: async () => {
      messageShown = true
    },
  }))

  const result = await operations.createMapping({
    rcloneRemote: 'synology',
    localBasePath: '/local',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, false)
  assert.equal(messageShown, false)
})

test('updateMappingExclusionPatterns sends a dedicated plain payload', async () => {
  let receivedPayload = null
  const operations = useMappingOperations(createPreload({
    updateMappingExclusionPatterns: async (payload) => {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
  }))
  const mapping = {
    rcloneRemote: 'synology',
    localBasePath: '/local',
    remoteBasePath: 'Projects',
    exclusionPatterns: ['old'],
  }

  const result = await operations.updateMappingExclusionPatterns(mapping, ['node_modules/', '*.tmp'])

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    mapping,
    exclusionPatterns: ['node_modules/', '*.tmp'],
  })
})

test('updateGlobalExclusionPatterns sends a dedicated plain payload', async () => {
  let receivedPayload = null
  const operations = useMappingOperations(createPreload({
    updateGlobalExclusionPatterns: async (payload) => {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true, value: payload.exclusionPatterns }
    },
  }))

  const result = await operations.updateGlobalExclusionPatterns(['.DS_Store', '*.tmp'])

  assert.deepEqual(result, { success: true, value: ['.DS_Store', '*.tmp'] })
  assert.deepEqual(receivedPayload, {
    exclusionPatterns: ['.DS_Store', '*.tmp'],
  })
})

test('createMapping validates the mapping before invoking preload', async () => {
  let createWasCalled = false
  const messages = []
  const operations = useMappingOperations(createPreload({
    createMapping: async () => {
      createWasCalled = true
      return { success: true }
    },
    showMessageBox: async (payload) => {
      messages.push(payload)
      return { success: true }
    },
  }))

  const result = await operations.createMapping({
    rcloneRemote: 'synology',
    localBasePath: '',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, false)
  assert.equal(createWasCalled, false)
  assert.equal(messages[0].key, `messages.${APP_MESSAGE_CODE.MAPPING_LOCAL_FOLDER_REQUIRED}`)
})

test('updateMapping validates the mapping reference before invoking preload', async () => {
  let updateWasCalled = false
  const messages = []
  const operations = useMappingOperations(createPreload({
    updateMapping: async () => {
      updateWasCalled = true
      return { success: true }
    },
    showMessageBox: async (payload) => {
      messages.push(payload)
      return { success: true }
    },
  }))

  const result = await operations.updateMapping(null, {
    rcloneRemote: 'synology',
    localBasePath: '/local',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, false)
  assert.equal(updateWasCalled, false)
  assert.equal(messages[0].key, `messages.${APP_MESSAGE_CODE.MAPPING_REQUIRED}`)
})

test('deleteMapping skips deletion when confirmation is cancelled', async () => {
  let deleteWasCalled = false
  const operations = useMappingOperations(createPreload({
    deleteMapping: async () => {
      deleteWasCalled = true
      return { success: true }
    },
    showMessageBox: async () => ({ success: true, value: 'cancelled' }),
  }))

  const result = await operations.deleteMapping({
    displayName: 'Project',
    rcloneRemote: 'synology',
    localBasePath: '/local',
  })

  assert.deepEqual(result, { success: true, value: 'cancelled' })
  assert.equal(deleteWasCalled, false)
})

test('deleteMapping sends its stable reference after confirmation', async () => {
  let receivedPayload = null
  let confirmationPayload = null
  const operations = useMappingOperations(createPreload({
    deleteMapping: async (payload) => {
      receivedPayload = payload
      structuredClone(payload)
      return { success: true }
    },
    showMessageBox: async (payload) => {
      confirmationPayload = payload
      return { success: true, value: 'confirmed' }
    },
  }))

  const result = await operations.deleteMapping({
    displayName: 'Project',
    rcloneRemote: 'synology',
    localBasePath: '/Users/example/Documents/Projects/Project',
    remoteBasePath: 'Projects',
  })

  assert.equal(result.success, true)
  assert.deepEqual(receivedPayload, {
    mapping: {
      rcloneRemote: 'synology',
      localBasePath: '/Users/example/Documents/Projects/Project',
    },
  })
  assert.deepEqual(confirmationPayload, {
    mode: 'confirm',
    key: `messages.${APP_MESSAGE_CODE.MAPPING_DELETE_CONFIRMATION}`,
    params: { mappingLabel: 'Project' },
  })
  assert.equal(Object.hasOwn(confirmationPayload, 'level'), false)
})

test('deleteMapping confirmation shows only a Windows folder name', async () => {
  let confirmationPayload = null
  const operations = useMappingOperations(createPreload({
    showMessageBox: async (payload) => {
      confirmationPayload = payload
      return { success: true, value: 'cancelled' }
    },
  }))

  await operations.deleteMapping({
    rcloneRemote: 'synology',
    localBasePath: 'C:\\Users\\example\\Documents\\Projects\\Project\\',
  })

  assert.deepEqual(confirmationPayload.params, { mappingLabel: 'Project' })
})
