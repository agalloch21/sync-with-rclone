import EventEmitter from 'node:events'
import * as serverOperations from './operations/server-operations.js'
import * as settingsOperations from './operations/settings-operations.js'
import * as taskOperations from './operations/task-operations.js'

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

export async function listSyncTasks() {
  return await taskOperations.listSyncTasks()
}

export async function listGlobalIgnorePatterns() {
  return await settingsOperations.listGlobalIgnorePatterns()
}

//* ========================================= Commands ========================================*/
// Commands perform requested work and may emit semantic progress for a shell to present.
// State-changing commands publish a configuration update after completing successfully.
export async function testServerConnection(name, onProgress) {
  await serverOperations.testServerConnection(name, onProgress)
}

export async function createServer(expectedName, protocolType, protocolFields, onProgress) {
  await serverOperations.createServerConnection(expectedName, protocolType, protocolFields, onProgress)

  notifyConfigUpdate()
}

export async function updateServer(name, expectedName, protocolType, protocolFields, onProgress) {
  const shouldRename = typeof name === 'string' && typeof expectedName === 'string'
    ? name.trim() !== expectedName.trim()
    : name !== expectedName

  if (shouldRename) {
    await renameServer(name, expectedName, protocolType, protocolFields, onProgress)
    return
  }

  await serverOperations.updateServerConnection(name, protocolType, protocolFields, onProgress)
  notifyConfigUpdate()
}

export async function deleteServer(name, onProgress) {
  await serverOperations.deleteServerConnection(name, onProgress)

  notifyConfigUpdate()
}

export async function renameServer(name, expectedName, protocolType = null, protocolFields = null, onProgress) {
  await serverOperations.renameServerConnection(name, expectedName, protocolType, protocolFields, onProgress)
  await taskOperations.retargetSyncTasks(name, expectedName, onProgress)

  notifyConfigUpdate()
}

export async function createSyncTask(task, onProgress) {
  const result = await taskOperations.createSyncTask(task, onProgress)
  notifyConfigUpdate()
  return result
}

export async function updateSyncTask(task, expectedTask, onProgress) {
  const result = await taskOperations.updateSyncTask(task, expectedTask, onProgress)
  notifyConfigUpdate()
  return result
}

export async function updateSyncTaskIgnorePatterns(task, ignorePatterns, onProgress) {
  const result = await taskOperations.updateSyncTaskIgnorePatterns(task, ignorePatterns, onProgress)
  notifyConfigUpdate()
  return result
}

export async function updateGlobalIgnorePatterns(ignorePatterns) {
  const result = await settingsOperations.updateGlobalIgnorePatterns(ignorePatterns)
  notifyConfigUpdate()
  return result
}

export async function deleteSyncTask(task, onProgress) {
  const result = await taskOperations.deleteTaskFromConfig(task, onProgress)
  notifyConfigUpdate()
  return result
}
