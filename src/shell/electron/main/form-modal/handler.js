import { createRequire } from 'node:module'
import os from 'node:os'
import { createMapping, createServer, getServer, listGlobalFilterPatterns, listServers, updateMapping, updateMappingFilterPatterns, updateServer } from '#src/app/app-api.js'
import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { MAPPING_OPERATION } from '#src/app/contracts/mapping.js'
import { SERVER_OPERATION } from '#src/app/contracts/server.js'
import { toSuccessfulResult } from '#src/app/operation-result.js'
import { getActiveModalWindow } from '../app-state.js'
import { openFolderDialog } from '../folder-dialog/window.js'
import { reportRequestError, runReportedOperation } from '../message-box/operation-presentation.js'

const require = createRequire(import.meta.url)

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertPayloadObject(payload) {
  if (!isPlainObject(payload)) {
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid IPC payload.', {
      detail: 'The request payload must be an object.',
    })
  }
}

function createLocalFolderDialogOptions(currentPath, homeDirectory = os.homedir()) {
  return {
    defaultPath: currentPath || homeDirectory,
    properties: ['openDirectory'],
  }
}

export function createFormModalHandlers() {
  async function listServersHandler(_event) {
    try {
      const result = await listServers()
      return toSuccessfulResult(result)
    }
    catch (error) {
      return await reportRequestError(error)
    }
  }

  async function getServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const { serverName } = payload || {}
      const result = await getServer(serverName)
      return toSuccessfulResult(result)
    }
    catch (error) {
      return await reportRequestError(error)
    }
  }

  async function getGlobalFilterPatternsHandler(_event) {
    try {
      return toSuccessfulResult(await listGlobalFilterPatterns())
    }
    catch (error) {
      return await reportRequestError(error)
    }
  }

  async function createServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    const { expectedServerName, protocolType, protocolFields } = payload
    return await runReportedOperation(
      SERVER_OPERATION.CREATE,
      onProgress => createServer(expectedServerName, protocolType, protocolFields, onProgress),
    )
  }

  async function updateServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    const { serverName, protocolType, protocolFields } = payload
    return await runReportedOperation(
      SERVER_OPERATION.UPDATE,
      onProgress => updateServer(serverName, protocolType, protocolFields, onProgress),
    )
  }

  async function createMappingHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    return await runReportedOperation(
      MAPPING_OPERATION.CREATE,
      onProgress => createMapping(payload.mapping, onProgress),
    )
  }

  async function updateMappingHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    return await runReportedOperation(
      MAPPING_OPERATION.UPDATE,
      onProgress => updateMapping(payload.mapping, payload.expectedMapping, onProgress),
    )
  }

  async function updateMappingFilterPatternsHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
    }
    catch (error) {
      return await reportRequestError(error)
    }

    return await runReportedOperation(
      MAPPING_OPERATION.UPDATE_FILTER_PATTERNS,
      onProgress => updateMappingFilterPatterns(payload.mapping, payload.filterPatterns, onProgress),
    )
  }

  async function selectLocalFolderHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const currentPath = typeof payload.currentPath === 'string' ? payload.currentPath : ''
      const { dialog } = require('electron')
      const result = await dialog.showOpenDialog(getActiveModalWindow(), createLocalFolderDialogOptions(currentPath))
      const selectedPath = result.canceled ? null : result.filePaths[0] || null
      return toSuccessfulResult(selectedPath)
    }
    catch (error) {
      return await reportRequestError(error)
    }
  }

  async function selectRemoteFolderHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const selectedPath = await openFolderDialog(getActiveModalWindow(), payload)
      return toSuccessfulResult(selectedPath)
    }
    catch (error) {
      return await reportRequestError(error)
    }
  }

  return {
    listServersHandler,
    getServerHandler,
    getGlobalFilterPatternsHandler,
    createServerHandler,
    updateServerHandler,
    createMappingHandler,
    updateMappingHandler,
    updateMappingFilterPatternsHandler,
    selectLocalFolderHandler,
    selectRemoteFolderHandler,

  }
}
