import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { MESSAGE_BOX_RESULT } from '#src/app/main-window/message-box-contract.js'
import { toFailureResult } from '#src/app/operation-result.js'
import { toRaw } from 'vue'
import { useMessageBox } from './useMessageBox.js'

export function formatIgnorePatterns(patterns) {
  if (!Array.isArray(patterns))
    return ''

  return patterns
    .filter(pattern => typeof pattern === 'string')
    .join(',\n')
}

export function parseIgnorePatterns(value) {
  if (typeof value !== 'string')
    return []

  return value
    .split(/[,\r\n]+/)
    .map(pattern => pattern.trim())
    .filter(Boolean)
}

export function useTaskOperations(windowPreload) {
  const messageBox = useMessageBox(windowPreload)

  function toPlainObject(value) {
    return structuredClone(toRaw(value || {}))
  }

  async function showOperationWarning(result) {
    await messageBox.error({
      ...result?.error,
      code: result?.error?.code || APP_ERROR_CODE.UNKNOWN,
      detail: result?.error?.detail,
    })
  }

  async function invokeOperation(operation) {
    try {
      const result = await operation()
      if (!result?.success)
        await showOperationWarning(result)
      return result
    }
    catch (error) {
      await messageBox.error({
        code: APP_ERROR_CODE.IPC_UNAVAILABLE,
        detail: error?.message,
      })
      return toFailureResult(error)
    }
  }

  async function validateServerName(serverName) {
    if (typeof serverName === 'string' && serverName.trim().length > 0)
      return true

    await messageBox.warning(APP_MESSAGE_CODE.SYNC_TASK_SERVER_REQUIRED)
    return false
  }

  async function validateTaskMapping(task) {
    if (!await validateServerName(task?.rcloneRemote))
      return false

    if (typeof task.localBasePath !== 'string' || task.localBasePath.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.SYNC_TASK_LOCAL_FOLDER_REQUIRED)
      return false
    }

    if (typeof task.remoteBasePath !== 'string') {
      await messageBox.warning(APP_MESSAGE_CODE.SYNC_TASK_REMOTE_FOLDER_REQUIRED)
      return false
    }

    return true
  }

  async function selectLocalFolder(currentPath = '') {
    return await invokeOperation(() => windowPreload?.selectLocalFolder?.({ currentPath }))
  }

  async function selectRemoteFolder(serverName, currentPath = '') {
    if (!await validateServerName(serverName))
      return toFailureResult()

    return await invokeOperation(() => windowPreload?.selectRemoteFolder?.({ serverName, currentPath }))
  }

  async function createSyncTask(task) {
    if (!await validateTaskMapping(task))
      return toFailureResult()

    return await invokeOperation(() => windowPreload?.createSyncTask?.({ task: toPlainObject(task) }))
  }

  async function updateSyncTask(task, expectedTask) {
    if (!task?.rcloneRemote || !task?.localBasePath) {
      await messageBox.warning(APP_MESSAGE_CODE.SYNC_TASK_REQUIRED)
      return toFailureResult()
    }

    if (!await validateTaskMapping(expectedTask))
      return toFailureResult()

    return await invokeOperation(() => windowPreload?.updateSyncTask?.({
      task: toPlainObject(task),
      expectedTask: toPlainObject(expectedTask),
    }))
  }

  async function updateSyncTaskIgnorePatterns(task, ignorePatterns) {
    if (!task?.rcloneRemote || !task?.localBasePath) {
      await messageBox.warning(APP_MESSAGE_CODE.SYNC_TASK_REQUIRED)
      return toFailureResult()
    }

    return await invokeOperation(() => windowPreload?.updateSyncTaskIgnorePatterns?.({
      task: toPlainObject(task),
      ignorePatterns: structuredClone(toRaw(ignorePatterns)),
    }))
  }

  async function updateGlobalIgnorePatterns(ignorePatterns) {
    return await invokeOperation(() => windowPreload?.updateGlobalIgnorePatterns?.({
      ignorePatterns: structuredClone(toRaw(ignorePatterns)),
    }))
  }

  async function deleteSyncTask(task) {
    if (!task?.rcloneRemote || !task?.localBasePath) {
      await messageBox.warning(APP_MESSAGE_CODE.SYNC_TASK_REQUIRED)
      return toFailureResult()
    }

    const taskLabel = task.displayName || task.localBasePath
    let confirmation
    try {
      confirmation = await messageBox.confirm(APP_MESSAGE_CODE.SYNC_TASK_DELETE_CONFIRMATION, {
        params: { taskLabel },
      })
    }
    catch (error) {
      await messageBox.error({
        code: APP_ERROR_CODE.IPC_UNAVAILABLE,
        detail: error?.message,
      })
      return toFailureResult(error)
    }

    if (!confirmation || confirmation.value !== MESSAGE_BOX_RESULT.CONFIRMED)
      return confirmation || toFailureResult()

    return await invokeOperation(() => windowPreload?.deleteSyncTask?.({
      task: toPlainObject({
        rcloneRemote: task.rcloneRemote,
        localBasePath: task.localBasePath,
      }),
    }))
  }

  return {
    validateServerName,
    selectLocalFolder,
    selectRemoteFolder,
    createSyncTask,
    updateSyncTask,
    updateSyncTaskIgnorePatterns,
    updateGlobalIgnorePatterns,
    deleteSyncTask,
  }
}
