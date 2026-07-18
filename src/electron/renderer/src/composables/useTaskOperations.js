import { toFailureResult } from '#src/app/operation-result.js'
import { toRaw } from 'vue'
import { useMessageBox } from './useMessageBox.js'

export function useTaskOperations(windowPreload) {
  const messageBox = useMessageBox(windowPreload)

  function toPlainObject(value) {
    return structuredClone(toRaw(value || {}))
  }

  async function showOperationWarning(result) {
    await messageBox.showWarningMessage({
      message: result?.error?.message,
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
      await messageBox.showErrorMessage({
        message: 'Something wrong when executing IPC functions.',
        detail: error?.message,
      })
      return toFailureResult(error)
    }
  }

  async function validateServerName(serverName) {
    if (typeof serverName === 'string' && serverName.trim().length > 0)
      return true

    await messageBox.showWarningMessage({
      title: 'Server Required',
      message: 'Choose a server first.',
    })
    return false
  }

  async function validateTaskMapping(task) {
    if (!await validateServerName(task?.rcloneRemote))
      return false

    if (typeof task.localBasePath !== 'string' || task.localBasePath.trim().length === 0) {
      await messageBox.showWarningMessage({
        title: 'Local Folder Required',
        message: 'Choose a local folder first.',
      })
      return false
    }

    if (typeof task.remoteBasePath !== 'string') {
      await messageBox.showWarningMessage({
        title: 'Server Folder Required',
        message: 'Choose a server folder first.',
      })
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

  async function updateSyncTask(taskReference, expectedTask) {
    if (!taskReference?.rcloneRemote || !taskReference?.localBasePath) {
      await messageBox.showWarningMessage({
        title: 'Task Required',
        message: 'Choose a sync task first.',
      })
      return toFailureResult()
    }

    if (!await validateTaskMapping(expectedTask))
      return toFailureResult()

    return await invokeOperation(() => windowPreload?.updateSyncTask?.({
      taskReference: toPlainObject(taskReference),
      expectedTask: toPlainObject(expectedTask),
    }))
  }

  return {
    selectLocalFolder,
    selectRemoteFolder,
    createSyncTask,
    updateSyncTask,
  }
}
