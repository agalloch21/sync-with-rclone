import { createRequire } from 'node:module'
import os from 'node:os'
import { APP_ERROR_CODE, throwAppError } from '#src/app/app-errors.js'
import { createServer, createSyncTask, getServer, listServers, updateServer, updateSyncTask, updateSyncTaskIgnorePatterns } from '#src/app/main-window/app-operations.js'
import { MESSAGE_BOX_LEVEL, MESSAGE_BOX_MODE, MESSAGE_BOX_RESULT } from '#src/app/main-window/message-box-contract.js'
import { APP_OPERATION } from '#src/app/operation-progress-contract.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { getActiveModalWindow } from '../app-state.js'
import { openFolderDialog } from '../folder-dialog/window.js'
import { closeMessageBox, openMessageBox, updateMessageBox } from '../message-box/window.js'

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

function formatErrorDetail(error) {
  const fieldDetail = Object.values(error?.fields || {})
    .filter(Boolean)
    .join('\n')

  return fieldDetail || error?.detail || ''
}

async function runProgressOperation(operation, execute, needAcknowledgement = false) {
  const acknowledgement = openMessageBox({
    mode: MESSAGE_BOX_MODE.PROGRESS,
    titleKey: `operationProgress.${operation}.title`,
    messageKey: `operationProgress.common.start`,
  })
  acknowledgement.catch(() => {})

  const onProgress = (step) => {
    updateMessageBox({
      mode: MESSAGE_BOX_MODE.PROGRESS,
      messageKey: `operationProgress.${operation}.steps.${step}`,
    })
  }

  try {
    const value = await execute(onProgress)

    if (needAcknowledgement) {
      updateMessageBox({
        mode: MESSAGE_BOX_MODE.MESSAGE,
        level: MESSAGE_BOX_LEVEL.SUCCESS,
        messageKey: `operationProgress.common.finish`,
      })
    }
    else {
      closeMessageBox(MESSAGE_BOX_RESULT.CONFIRMED)
    }

    await acknowledgement

    return toSuccessfulResult(value)
  }
  catch (error) {
    const result = toFailureResult(error)

    updateMessageBox({
      mode: MESSAGE_BOX_MODE.MESSAGE,
      level: MESSAGE_BOX_LEVEL.ERROR,
      titleKey: 'operationProgress.common.failedTitle',
      messageKey: error?.code ? `errors.${error.code}` : '',
      detail: formatErrorDetail(error),
    })

    await acknowledgement

    return result
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

      return await runProgressOperation(
        APP_OPERATION.CREATE_SERVER,
        onProgress => createServer(expectedServerName, protocolType, protocolFields, onProgress),
      )
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
      return toSuccessfulResult(await updateSyncTask(payload.task, payload.expectedTask))
    }
    catch (error) {
      return toFailureResult(error)
    }
  }

  async function updateSyncTaskIgnorePatternsHandler(_event, payload) {
    try {
      assertPayloadObject(payload)
      return toSuccessfulResult(await updateSyncTaskIgnorePatterns(payload.task, payload.ignorePatterns))
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
    updateSyncTaskIgnorePatternsHandler,
    selectLocalFolderHandler,
    selectRemoteFolderHandler,

  }
}
