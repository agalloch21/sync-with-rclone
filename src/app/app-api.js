import EventEmitter from 'node:events'
import {
  defineAppOperation,
  listOperationHistory as readOperationHistory,
} from './operations/operation-history.js'
import { SERVER_OPERATION } from './operations/server-operation-contract.js'
import * as serverOperations from './operations/server-operations.js'
import { SETTINGS_OPERATION } from './operations/settings-operation-contract.js'
import * as settingsOperations from './operations/settings-operations.js'
import { SYNC_TASK_OPERATION } from './operations/task-operation-contract.js'
import * as taskOperations from './operations/task-operations.js'

export { startSync } from './sync-session/start-sync.js'

//* ================================ Configuration Notifications ==============================*/
// Commands currently publish this event so the desktop shell can refresh its read model.
export const configEventEmitter = new EventEmitter()

export function registerConfigUpdateListener(fn) {
  configEventEmitter.on('update', fn)
}
export function unregisterConfigUpdateListener(fn) {
  configEventEmitter.off('update', fn)
}
export function notifyConfigUpdate() {
  configEventEmitter.emit('update')
}

//* ========================================== Queries ========================================*/
// Queries only read and return application state; they do not report progress or publish updates.
export async function getMainWindowData() {
  const servers = await listServers()
  const syncTasks = await listSyncTasks()
  const globalIgnorePatterns = await listGlobalIgnorePatterns()

  const serverByName = new Map(servers.map((server) => {
    return [server.name, server]
  }))

  syncTasks.forEach((task) => {
    if (!serverByName.has(task.rcloneRemote)) {
      const missingServer = serverOperations.buildEmptyServerObject(task.rcloneRemote)
      missingServer.status = 'missing'
      serverByName.set(task.rcloneRemote, missingServer)
    }
  })

  return {
    servers: [...serverByName.values()],
    syncTasks,
    globalIgnorePatterns,
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

export async function listSyncTasks() {
  return await taskOperations.listSyncTasks()
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

async function updateServerImpl(name, expectedName, protocolType, protocolFields, onProgress) {
  const shouldRename = typeof name === 'string' && typeof expectedName === 'string'
    ? name.trim() !== expectedName.trim()
    : name !== expectedName

  if (shouldRename) {
    await renameServerImpl(name, expectedName, protocolType, protocolFields, onProgress)
    return
  }

  await serverOperations.updateServerConnection(name, protocolType, protocolFields, onProgress)
  notifyConfigUpdate()
}

async function deleteServerImpl(name, onProgress) {
  await serverOperations.deleteServerConnection(name, onProgress)

  notifyConfigUpdate()
}

async function renameServerImpl(name, expectedName, protocolType = null, protocolFields = null, onProgress) {
  await serverOperations.renameServerConnection(name, expectedName, protocolType, protocolFields, onProgress)
  await taskOperations.retargetSyncTasks(name, expectedName, onProgress)

  notifyConfigUpdate()
}

async function createSyncTaskImpl(task, onProgress) {
  const result = await taskOperations.createSyncTask(task, onProgress)
  notifyConfigUpdate()
  return result
}

async function updateSyncTaskImpl(task, expectedTask, onProgress) {
  const result = await taskOperations.updateSyncTask(task, expectedTask, onProgress)
  notifyConfigUpdate()
  return result
}

async function updateSyncTaskIgnorePatternsImpl(task, ignorePatterns, onProgress) {
  const result = await taskOperations.updateSyncTaskIgnorePatterns(task, ignorePatterns, onProgress)
  notifyConfigUpdate()
  return result
}

async function updateGlobalIgnorePatternsImpl(ignorePatterns) {
  const result = await settingsOperations.updateGlobalIgnorePatterns(ignorePatterns)
  notifyConfigUpdate()
  return result
}

async function deleteSyncTaskImpl(task, onProgress) {
  const result = await taskOperations.deleteTaskFromConfig(task, onProgress)
  notifyConfigUpdate()
  return result
}

function serverSubject(name, expectedName = undefined) {
  return {
    type: 'server',
    name: typeof name === 'string' ? name.trim() : '',
    ...(expectedName !== undefined && {
      expectedName: typeof expectedName === 'string' ? expectedName.trim() : '',
    }),
  }
}

function syncTaskSubject(task = {}) {
  return {
    type: 'syncTask',
    rcloneRemote: typeof task?.rcloneRemote === 'string' ? task.rcloneRemote.trim() : '',
    localBasePath: typeof task?.localBasePath === 'string' ? task.localBasePath : '',
    ...(typeof task?.remoteBasePath === 'string' && { remoteBasePath: task.remoteBasePath }),
  }
}

export const createServer = defineAppOperation({
  operation: SERVER_OPERATION.CREATE,
  getSubject: ([name]) => serverSubject(name),
}, createServerImpl)

export const updateServer = defineAppOperation({
  operation: SERVER_OPERATION.UPDATE,
  getSubject: ([name, expectedName]) => serverSubject(name, expectedName),
}, updateServerImpl)

export const deleteServer = defineAppOperation({
  operation: SERVER_OPERATION.DELETE,
  getSubject: ([name]) => serverSubject(name),
}, deleteServerImpl)

export const renameServer = defineAppOperation({
  operation: SERVER_OPERATION.UPDATE,
  getSubject: ([name, expectedName]) => serverSubject(name, expectedName),
}, renameServerImpl)

export const createSyncTask = defineAppOperation({
  operation: SYNC_TASK_OPERATION.CREATE,
  getSubject: ([task]) => syncTaskSubject(task),
}, createSyncTaskImpl)

export const updateSyncTask = defineAppOperation({
  operation: SYNC_TASK_OPERATION.UPDATE,
  getSubject: ([task, expectedTask]) => ({
    ...syncTaskSubject(task),
    expected: syncTaskSubject(expectedTask),
  }),
}, updateSyncTaskImpl)

export const updateSyncTaskIgnorePatterns = defineAppOperation({
  operation: SYNC_TASK_OPERATION.UPDATE_IGNORE_PATTERNS,
  getSubject: ([task]) => syncTaskSubject(task),
}, updateSyncTaskIgnorePatternsImpl)

export const updateGlobalIgnorePatterns = defineAppOperation({
  operation: SETTINGS_OPERATION.UPDATE_GLOBAL_IGNORE_PATTERNS,
  getSubject: () => ({ type: 'settings', name: 'globalIgnorePatterns' }),
}, updateGlobalIgnorePatternsImpl)

export const deleteSyncTask = defineAppOperation({
  operation: SYNC_TASK_OPERATION.DELETE,
  getSubject: ([task]) => syncTaskSubject(task),
}, deleteSyncTaskImpl)
