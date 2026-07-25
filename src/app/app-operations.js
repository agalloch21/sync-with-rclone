import EventEmitter from 'node:events'
import * as serverOperations from './configuration/server-operations.js'
import * as settingsOperations from './configuration/settings-operations.js'
import * as taskOperations from './configuration/task-operations.js'

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

//* ================================ App-Level Operations ==============================*/
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

//* ================================ Server Operations ==============================*/
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
  await serverOperations.testServerConnection(name)
}
export async function createServer(expectedName, protocolType, protocolFields, onProgress) {
  await serverOperations.createServerConnection(expectedName, protocolType, protocolFields, onProgress)

  notifyConfigUpdate()
}

export async function updateServer(name, expectedName, protocolType, protocolFields) {
  const shouldRename = typeof name === 'string' && typeof expectedName === 'string'
    ? name.trim() !== expectedName.trim()
    : name !== expectedName

  if (shouldRename) {
    await renameServer(name, expectedName, protocolType, protocolFields)
    return
  }

  await serverOperations.updateServerConnection(name, protocolType, protocolFields)
  notifyConfigUpdate()
}

export async function deleteServer(name) {
  await serverOperations.deleteServerConnection(name)

  notifyConfigUpdate()
}

export async function renameServer(name, expectedName, protocolType = null, protocolFields = null) {
  await serverOperations.renameServerConnection(name, expectedName, protocolType, protocolFields)
  await taskOperations.retargetSyncTasks(name, expectedName)

  notifyConfigUpdate()
}

//* ================================ Task Operations ==============================*/
export async function listSyncTasks() {
  return await taskOperations.listSyncTasks()
}

export async function listGlobalIgnorePatterns() {
  return await settingsOperations.listGlobalIgnorePatterns()
}

export async function createSyncTask(task) {
  const result = await taskOperations.createSyncTask(task)
  notifyConfigUpdate()
  return result
}

export async function updateSyncTask(task, expectedTask) {
  const result = await taskOperations.updateSyncTask(task, expectedTask)
  notifyConfigUpdate()
  return result
}

export async function updateSyncTaskIgnorePatterns(task, ignorePatterns) {
  const result = await taskOperations.updateSyncTaskIgnorePatterns(task, ignorePatterns)
  notifyConfigUpdate()
  return result
}

export async function updateGlobalIgnorePatterns(ignorePatterns) {
  const result = await settingsOperations.updateGlobalIgnorePatterns(ignorePatterns)
  notifyConfigUpdate()
  return result
}

export async function deleteSyncTask(task) {
  const result = await taskOperations.deleteTaskFromConfig(task)
  if (result.success)
    notifyConfigUpdate()
  return result
}
