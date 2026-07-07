import EventEmitter from 'node:events'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
// import { loadAppConfig } from '../configuration/app-config';
import * as serverOperations from '../configuration/server-operations.js'
import * as taskOperations from '../configuration/task-operations.js'

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
  }
}

//* ================================ Server Operations ==============================*/
export async function listServers() {
  return await serverOperations.listServerConnections()
}

export async function getServer(serverName) {
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
    throwAppError(APP_ERROR_CODE.SERVER_INVALID_OPERATION, 'Invalid test server request.')
  }

  return await serverOperations.getServerConnection(serverName)
}

export async function testServerConnection(serverName) {
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
    throwAppError(APP_ERROR_CODE.SERVER_INVALID_OPERATION, 'Invalid test server request.')
  }

  await serverOperations.testServerConnection(serverName)
}
export async function createServer(expectedServerName, protocolType, protocolFields) {
  if (!expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0
    || !protocolType || !protocolFields) {
    throwAppError(APP_ERROR_CODE.SERVER_INVALID_OPERATION, 'Invalid create server request.')
  }

  await serverOperations.createServerConnection(expectedServerName, protocolType, protocolFields)

  notifyConfigUpdate()
}

export async function updateServer(serverName, expectedServerName, protocolType, protocolFields) {
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0
    || !expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0
    || !protocolType || !protocolFields) {
    throwAppError(APP_ERROR_CODE.SERVER_INVALID_OPERATION, 'Invalid update server request.')
  }

  if (serverName.trim() === expectedServerName.trim()) {
    await serverOperations.updateServerConnection(serverName, protocolType, protocolFields)
  }
  else {
    await serverOperations.renameServerConnection(serverName, expectedServerName, protocolType, protocolFields)
  }

  notifyConfigUpdate()
}

export async function deleteServer(serverName) {
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
    throwAppError(APP_ERROR_CODE.SERVER_INVALID_OPERATION, 'Invalid delete server request.')
  }

  await serverOperations.deleteServerConnection(serverName)

  notifyConfigUpdate()
}

export async function renameServer(serverName, expectedServerName) {
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0
    || !expectedServerName || typeof expectedServerName !== 'string' || expectedServerName.trim().length === 0) {
    throwAppError(APP_ERROR_CODE.SERVER_INVALID_OPERATION, 'Invalid rename server request.')
  }

  await serverOperations.renameServerConnection(serverName, expectedServerName)

  // update tasks target

  notifyConfigUpdate()
}

//* ================================ Task Operations ==============================*/
export async function listSyncTasks() {
  return await taskOperations.listSyncTasks()
}
