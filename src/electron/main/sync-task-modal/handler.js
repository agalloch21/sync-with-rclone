import { createRequire } from 'node:module'
import os from 'node:os'
import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { createServer, createSyncTask, getServer, listServers, updateServer, updateSyncTask } from '#src/app/main-window/app-operations.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { getActiveModalWindow } from '../app-state.js'
import { openFolderDialog } from '../folder-dialog/window.js'

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

export function createLocalFolderDialogOptions(currentPath, homeDirectory = os.homedir()) {
  return {
    defaultPath: currentPath || homeDirectory,
    properties: ['openDirectory'],
  }
}

export function createSyncTaskModalHandlers() {
  async function listServersHandler(_event) {
    try {
      const result = await listServers()
      return toSuccessfulResult(result)
    }
    catch (error) {
      return toFailureResult(error)
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
      return toFailureResult(error)
    }
  }

  async function createServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const { expectedServerName, protocolType, protocolFields } = payload || {}

      await createServer(expectedServerName, protocolType, protocolFields)

      return toSuccessfulResult()
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function updateServerHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const { serverName, expectedServerName, protocolType, protocolFields } = payload || {}

      await updateServer(serverName, expectedServerName, protocolType, protocolFields)

      return toSuccessfulResult()
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function createSyncTaskHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      return toSuccessfulResult(await createSyncTask(payload.task))
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function updateSyncTaskHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      return toSuccessfulResult(await updateSyncTask(payload.taskReference, payload.expectedTask))
    }
    catch (error) {
      return toFailureResult(error)
    }
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
      return toFailureResult(error)
    }
  }

  async function selectRemoteFolderHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      const selectedPath = await openFolderDialog(getActiveModalWindow(), payload)
      return toSuccessfulResult(selectedPath)
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  return {
    listServersHandler,
    getServerHandler,
    createServerHandler,
    updateServerHandler,
    createSyncTaskHandler,
    updateSyncTaskHandler,
    selectLocalFolderHandler,
    selectRemoteFolderHandler,

  }
}
