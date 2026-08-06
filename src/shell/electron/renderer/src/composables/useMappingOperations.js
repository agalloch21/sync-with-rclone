import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { OPERATION_REPORT_ACKNOWLEDGEMENT } from '#src/app/contracts/operation-report.js'
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

export function useMappingOperations(windowPreload) {
  const messageBox = useMessageBox(windowPreload)

  function toPlainObject(value) {
    return structuredClone(toRaw(value || {}))
  }

  async function invokeRequest(request) {
    try {
      return await request()
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

    await messageBox.warning(APP_MESSAGE_CODE.MAPPING_SERVER_REQUIRED)
    return false
  }

  async function validateMapping(mapping) {
    if (!await validateServerName(mapping?.rcloneRemote))
      return false

    if (typeof mapping.localBasePath !== 'string' || mapping.localBasePath.trim().length === 0) {
      await messageBox.warning(APP_MESSAGE_CODE.MAPPING_LOCAL_FOLDER_REQUIRED)
      return false
    }

    if (typeof mapping.remoteBasePath !== 'string') {
      await messageBox.warning(APP_MESSAGE_CODE.MAPPING_REMOTE_FOLDER_REQUIRED)
      return false
    }

    return true
  }

  async function selectLocalFolder(currentPath = '') {
    return await invokeRequest(() => windowPreload?.selectLocalFolder?.({ currentPath }))
  }

  async function selectRemoteFolder(serverName, currentPath = '') {
    if (!await validateServerName(serverName))
      return toFailureResult()

    return await invokeRequest(() => windowPreload?.selectRemoteFolder?.({ serverName, currentPath }))
  }

  async function createMapping(mapping) {
    if (!await validateMapping(mapping))
      return toFailureResult()

    return await invokeRequest(() => windowPreload?.createMapping?.({ mapping: toPlainObject(mapping) }))
  }

  async function updateMapping(mapping, expectedMapping) {
    if (!mapping?.rcloneRemote || !mapping?.localBasePath) {
      await messageBox.warning(APP_MESSAGE_CODE.MAPPING_REQUIRED)
      return toFailureResult()
    }

    if (!await validateMapping(expectedMapping))
      return toFailureResult()

    return await invokeRequest(() => windowPreload?.updateMapping?.({
      mapping: toPlainObject(mapping),
      expectedMapping: toPlainObject(expectedMapping),
    }))
  }

  async function updateMappingIgnorePatterns(mapping, ignorePatterns) {
    if (!mapping?.rcloneRemote || !mapping?.localBasePath) {
      await messageBox.warning(APP_MESSAGE_CODE.MAPPING_REQUIRED)
      return toFailureResult()
    }

    return await invokeRequest(() => windowPreload?.updateMappingIgnorePatterns?.({
      mapping: toPlainObject(mapping),
      ignorePatterns: structuredClone(toRaw(ignorePatterns)),
    }))
  }

  async function updateGlobalIgnorePatterns(ignorePatterns) {
    return await invokeRequest(() => windowPreload?.updateGlobalIgnorePatterns?.({
      ignorePatterns: structuredClone(toRaw(ignorePatterns)),
    }))
  }

  async function deleteMapping(mapping) {
    if (!mapping?.rcloneRemote || !mapping?.localBasePath) {
      await messageBox.warning(APP_MESSAGE_CODE.MAPPING_REQUIRED)
      return toFailureResult()
    }

    const mappingLabel = mapping.displayName || mapping.localBasePath
    let confirmation
    try {
      confirmation = await messageBox.confirm(APP_MESSAGE_CODE.MAPPING_DELETE_CONFIRMATION, {
        params: { mappingLabel },
      })
    }
    catch (error) {
      await messageBox.error({
        code: APP_ERROR_CODE.IPC_UNAVAILABLE,
        detail: error?.message,
      })
      return toFailureResult(error)
    }

    if (!confirmation || confirmation.value !== OPERATION_REPORT_ACKNOWLEDGEMENT.CONFIRMED)
      return confirmation || toFailureResult()

    return await invokeRequest(() => windowPreload?.deleteMapping?.({
      mapping: toPlainObject({
        rcloneRemote: mapping.rcloneRemote,
        localBasePath: mapping.localBasePath,
      }),
    }))
  }

  return {
    validateServerName,
    selectLocalFolder,
    selectRemoteFolder,
    createMapping,
    updateMapping,
    updateMappingIgnorePatterns,
    updateGlobalIgnorePatterns,
    deleteMapping,
  }
}
