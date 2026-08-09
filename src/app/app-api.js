import {
  notifyConfigUpdate,
  registerConfigUpdateListener,
  unregisterConfigUpdateListener,
} from './app-events.js'
import { MAPPING_OPERATION } from './contracts/mapping.js'
import { SERVER_OPERATION } from './contracts/server.js'
import { SETTINGS_OPERATION } from './contracts/settings.js'
import * as mappingOperations from './operations/mapping.js'
import {
  defineAppOperation,
  listOperationHistory as readOperationHistory,
  registerOperationHistoryListener,
  unregisterOperationHistoryListener,
} from './operations/operation-history.js'
import * as serverOperations from './operations/server.js'
import * as settingsOperations from './operations/settings.js'

export {
  registerConfigUpdateListener,
  registerOperationHistoryListener,
  unregisterConfigUpdateListener,
  unregisterOperationHistoryListener,
}

export { startSync } from './operations/sync/start.js'

//* ========================================== Queries ========================================*/
// Queries only read and return application state; they do not report progress or publish updates.
export async function getMainWindowData() {
  const servers = await listServers()
  const mappings = await listMappings()

  const serverByName = new Map(servers.map((server) => {
    return [server.name, server]
  }))

  mappings.forEach((mapping) => {
    if (!serverByName.has(mapping.rcloneRemote)) {
      const missingServer = serverOperations.buildEmptyServerObject(mapping.rcloneRemote)
      missingServer.status = 'missing'
      serverByName.set(mapping.rcloneRemote, missingServer)
    }
  })

  return {
    servers: [...serverByName.values()],
    mappings,
  }
}

export async function listServers() {
  return await serverOperations.listServerConnections()
}

export async function getServer(name) {
  return await serverOperations.getServerConnection(name)
}

export async function getFolderTree(name, folderPath = '') {
  return await serverOperations.getFolderTree(name, folderPath)
}

export async function testServerConnection(name) {
  return await serverOperations.testServerConnection(name)
}

export async function listMappings() {
  return await mappingOperations.listMappings()
}

export async function listGlobalIgnorePatterns() {
  return await settingsOperations.listGlobalIgnorePatterns()
}

export async function listOperationHistory(options) {
  return await readOperationHistory(options)
}

//* ========================================= Commands ========================================*/
// Commands perform requested work and may emit semantic progress for a shell to present.
// State-changing commands publish a configuration update after completing successfully.
async function createServerImpl(expectedName, protocolType, protocolFields, onProgress) {
  await serverOperations.createServerConnection(expectedName, protocolType, protocolFields, onProgress)

  notifyConfigUpdate()
}

async function updateServerImpl(name, protocolType, protocolFields, onProgress) {
  await serverOperations.updateServerConnection(name, protocolType, protocolFields, onProgress)

  notifyConfigUpdate()
}

async function deleteServerImpl(name, onProgress) {
  await serverOperations.deleteServerConnection(name, onProgress)

  notifyConfigUpdate()
}

async function createMappingImpl(mapping, onProgress) {
  const result = await mappingOperations.createMapping(mapping, onProgress)
  notifyConfigUpdate()
  return result
}

async function updateMappingImpl(mapping, expectedMapping, onProgress) {
  const result = await mappingOperations.updateMapping(mapping, expectedMapping, onProgress)
  notifyConfigUpdate()
  return result
}

async function updateMappingIgnorePatternsImpl(mapping, ignorePatterns, onProgress) {
  const result = await mappingOperations.updateMappingIgnorePatterns(mapping, ignorePatterns, onProgress)
  notifyConfigUpdate()
  return result
}

async function updateGlobalIgnorePatternsImpl(ignorePatterns) {
  const result = await settingsOperations.updateGlobalIgnorePatterns(ignorePatterns)
  notifyConfigUpdate()
  return result
}

async function deleteMappingImpl(mapping, onProgress) {
  const result = await mappingOperations.deleteMapping(mapping, onProgress)
  notifyConfigUpdate()
  return result
}

function serverSubject(name) {
  return {
    type: 'server',
    name: typeof name === 'string' ? name.trim() : '',
  }
}

function mappingSubject(mapping = {}) {
  return {
    type: 'mapping',
    rcloneRemote: typeof mapping?.rcloneRemote === 'string' ? mapping.rcloneRemote.trim() : '',
    localBasePath: typeof mapping?.localBasePath === 'string' ? mapping.localBasePath : '',
    ...(typeof mapping?.remoteBasePath === 'string' && { remoteBasePath: mapping.remoteBasePath }),
  }
}

export const createServer = defineAppOperation({
  operation: SERVER_OPERATION.CREATE,
  getSubject: ([name]) => serverSubject(name),
}, createServerImpl)

export const updateServer = defineAppOperation({
  operation: SERVER_OPERATION.UPDATE,
  getSubject: ([name]) => serverSubject(name),
}, updateServerImpl)

export const deleteServer = defineAppOperation({
  operation: SERVER_OPERATION.DELETE,
  getSubject: ([name]) => serverSubject(name),
}, deleteServerImpl)

export const createMapping = defineAppOperation({
  operation: MAPPING_OPERATION.CREATE,
  getSubject: ([mapping]) => mappingSubject(mapping),
}, createMappingImpl)

export const updateMapping = defineAppOperation({
  operation: MAPPING_OPERATION.UPDATE,
  getSubject: ([mapping, expectedMapping]) => ({
    ...mappingSubject(mapping),
    expected: mappingSubject(expectedMapping),
  }),
}, updateMappingImpl)

export const updateMappingIgnorePatterns = defineAppOperation({
  operation: MAPPING_OPERATION.UPDATE_IGNORE_PATTERNS,
  getSubject: ([mapping]) => mappingSubject(mapping),
}, updateMappingIgnorePatternsImpl)

export const updateGlobalIgnorePatterns = defineAppOperation({
  operation: SETTINGS_OPERATION.UPDATE_GLOBAL_IGNORE_PATTERNS,
  getSubject: () => ({ type: 'settings', name: 'globalIgnorePatterns' }),
}, updateGlobalIgnorePatternsImpl)

export const deleteMapping = defineAppOperation({
  operation: MAPPING_OPERATION.DELETE,
  getSubject: ([mapping]) => mappingSubject(mapping),
}, deleteMappingImpl)
