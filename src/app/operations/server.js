import { APP_ERROR_CODE, getErrorCode, throwAppError } from '../app-errors.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_DELETE_PROGRESS_STEP,
  SERVER_UPDATE_PROGRESS_STEP,
} from '../contracts/server.js'
import * as serverService from '../services/server.js'
import * as mappingOperations from './mapping.js'

export const buildEmptyServerObject = serverService.buildEmptyServer
export const getFolderTree = serverService.getServerFolderTree
export const listServerConnections = serverService.listServers
export const getServerConnection = serverService.getServer
export const testServerConnection = serverService.testServer

export async function createServerConnection(expectedName, protocolType, protocolFields, onProgress) {
  onProgress?.(SERVER_CREATE_PROGRESS_STEP.SAVE)
  const savedName = await serverService.createServer(expectedName, protocolType, protocolFields)

  try {
    onProgress?.(SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION)
    await serverService.testServer(savedName)
  }
  catch (error) {
    let rollbackError = null
    try {
      onProgress?.(SERVER_CREATE_PROGRESS_STEP.ROLLBACK)
      await serverService.deleteCreatedServer(savedName)
    }
    catch (caughtRollbackError) {
      rollbackError = caughtRollbackError
    }

    error.detail ||= 'The server was saved temporarily, but the connection test failed.'
    if (rollbackError)
      error.meta = { ...error.meta, rollbackErrorCode: getErrorCode(rollbackError) }
    throw error
  }
}

export async function updateServerConnection(name, protocolType, protocolFields, onProgress) {
  onProgress?.(SERVER_UPDATE_PROGRESS_STEP.SAVE)
  await serverService.updateServer(name, protocolType, protocolFields)
}

export async function deleteServerConnection(name, onProgress) {
  const activeMappings = await mappingOperations.listMappingsByServer(name)
  if (activeMappings.length > 0) {
    throwAppError(APP_ERROR_CODE.SERVER_HAS_MAPPINGS, 'Server has active mappings.', {
      detail: 'Delete the mappings that use this server before deleting the server.',
      meta: { name, mappingCount: activeMappings.length },
    })
  }

  onProgress?.(SERVER_DELETE_PROGRESS_STEP.DELETE)
  await serverService.deleteServer(name)
}
