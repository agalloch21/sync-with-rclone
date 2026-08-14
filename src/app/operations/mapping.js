import { createSyncFilter } from '#src/core/filters/sync-filter.js'
import { resolveLocalDirectoryPath as resolveInfrastructureLocalDirectoryPath } from '#src/infrastructure/filesystem/local-path.js'
import { normalizeRemoteBasePath as normalizeInfrastructureRemoteBasePath } from '#src/infrastructure/rclone/remote-path.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import {
  MAPPING_DELETE_PROGRESS_STEP,
  MAPPING_SAVE_PROGRESS_STEP,
} from '../contracts/mapping.js'
import * as mappingService from '../services/mapping.js'

function assertMappingInput(mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid mapping payload.')

  if (!mapping.rcloneRemote || typeof mapping.rcloneRemote !== 'string')
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'A server is required.')

  if (!Object.hasOwn(mapping, 'remoteBasePath') || typeof mapping.remoteBasePath !== 'string')
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'A remote folder path is required.')
}

function assertMappingReference(mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid mapping reference.')

  if (!mapping.rcloneRemote || typeof mapping.rcloneRemote !== 'string' || !mapping.localBasePath)
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'A mapping reference requires a server and local folder.')
}

function resolveMappingLocalBasePath(inputPath) {
  try {
    return resolveInfrastructureLocalDirectoryPath(inputPath)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.PATH_INVALID, 'Invalid local directory path.', {
      cause: error,
    })
  }
}

function normalizeRemoteBasePath(inputPath) {
  try {
    return normalizeInfrastructureRemoteBasePath(inputPath)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_INVALID, 'Invalid remote folder path.', {
      cause: error,
      meta: { remoteBasePath: inputPath },
    })
  }
}

function normalizeMapping(mapping) {
  assertMappingInput(mapping)

  return {
    rcloneRemote: mapping.rcloneRemote.trim(),
    localBasePath: resolveMappingLocalBasePath(mapping.localBasePath),
    remoteBasePath: normalizeRemoteBasePath(mapping.remoteBasePath),
  }
}

function assertFilterPatterns(filterPatterns) {
  try {
    createSyncFilter(filterPatterns)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, error.message, { cause: error })
  }
}

export const listMappings = mappingService.listMappings
export const listMappingsByServer = mappingService.listMappingsByServer

export async function createMapping(mapping, onProgress) {
  const normalizedMapping = normalizeMapping(mapping)
  const nextMapping = {
    displayName: '',
    ...normalizedMapping,
    filterPatterns: [],
    lastSyncMode: null,
    lastSyncFolder: null,
    lastSyncDate: null,
  }

  onProgress?.(MAPPING_SAVE_PROGRESS_STEP.SAVE)
  return await mappingService.createMapping(nextMapping)
}

export async function updateMapping(mapping, expectedMapping, onProgress) {
  assertMappingReference(mapping)
  const normalizedMapping = normalizeMapping(expectedMapping)
  onProgress?.(MAPPING_SAVE_PROGRESS_STEP.SAVE)
  return await mappingService.updateMapping(mapping, normalizedMapping)
}

export async function updateMappingFilterPatterns(mapping, filterPatterns, onProgress) {
  assertMappingReference(mapping)
  assertFilterPatterns(filterPatterns)
  onProgress?.(MAPPING_SAVE_PROGRESS_STEP.SAVE)
  return await mappingService.updateMappingFilterPatterns(mapping, filterPatterns)
}

export async function deleteMapping(mapping, onProgress) {
  assertMappingReference(mapping)
  onProgress?.(MAPPING_DELETE_PROGRESS_STEP.DELETE)
  return await mappingService.deleteMapping(mapping)
}
