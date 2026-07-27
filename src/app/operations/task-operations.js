import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import * as appConfig from '../configuration/app-config.js'
import { normalizeLocalPath, resolveLocalDirectoryPath, trimTrailingSlash } from '../path-utils.js'
import {
  SYNC_TASK_DELETE_PROGRESS_STEP,
  SYNC_TASK_RETARGET_PROGRESS_STEP,
  SYNC_TASK_SAVE_PROGRESS_STEP,
} from './task-operation-contract.js'

function assertTaskInput(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid sync task payload.')

  if (!task.rcloneRemote || typeof task.rcloneRemote !== 'string')
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'A server is required.')

  if (!Object.hasOwn(task, 'remoteBasePath') || typeof task.remoteBasePath !== 'string')
    throwAppError(APP_ERROR_CODE.REMOTE_FOLDER_PATH_REQUIRED, 'A remote folder path is required.')
}

function assertTaskReference(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Invalid sync task reference.')

  if (!task.rcloneRemote || typeof task.rcloneRemote !== 'string' || !task.localBasePath)
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'A sync task reference requires a server and local folder.')
}

function normalizeTaskMapping(task) {
  assertTaskInput(task)
  return {
    rcloneRemote: task.rcloneRemote.trim(),
    localBasePath: resolveLocalDirectoryPath(task.localBasePath),
    remoteBasePath: trimTrailingSlash(normalizeLocalPath(task.remoteBasePath)),
  }
}

function assertIgnorePatterns(ignorePatterns) {
  if (!Array.isArray(ignorePatterns) || ignorePatterns.some(pattern => typeof pattern !== 'string'))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Ignore patterns must be an array of strings.')
}

function normalizeServerName(name) {
  if (typeof name !== 'string' || name.trim().length === 0)
    throwAppError(APP_ERROR_CODE.SERVER_VALIDATION_FAILED, 'A server name is required.')

  return name.trim()
}

export async function listSyncTasks() {
  return await appConfig.listSyncTasks()
}

export async function createSyncTask(task, onProgress) {
  const mapping = normalizeTaskMapping(task)
  const nextTask = {
    displayName: '',
    ...mapping,
    ignorePatterns: [],
    lastSyncMode: null,
    lastSyncFolder: null,
    lastSyncDate: null,
  }

  onProgress?.(SYNC_TASK_SAVE_PROGRESS_STEP.SAVE)
  return await appConfig.createSyncTask(nextTask)
}

export async function updateSyncTask(task, expectedTask, onProgress) {
  assertTaskReference(task)
  const mapping = normalizeTaskMapping(expectedTask)
  onProgress?.(SYNC_TASK_SAVE_PROGRESS_STEP.SAVE)
  return await appConfig.updateSyncTask(task, mapping)
}

export async function updateSyncTaskIgnorePatterns(task, ignorePatterns, onProgress) {
  assertTaskReference(task)
  assertIgnorePatterns(ignorePatterns)
  onProgress?.(SYNC_TASK_SAVE_PROGRESS_STEP.SAVE)
  return await appConfig.updateSyncTaskIgnorePatterns(task, ignorePatterns)
}

export async function retargetSyncTasks(serverName, expectedServerName, onProgress) {
  const currentName = normalizeServerName(serverName)
  const nextName = normalizeServerName(expectedServerName)

  if (currentName === nextName)
    return await appConfig.listSyncTasks()

  onProgress?.(SYNC_TASK_RETARGET_PROGRESS_STEP.RETARGET)
  return await appConfig.retargetSyncTasks(currentName, nextName)
}

export async function deleteTaskFromConfig(task, onProgress) {
  assertTaskReference(task)
  onProgress?.(SYNC_TASK_DELETE_PROGRESS_STEP.DELETE)
  return await appConfig.deleteSyncTask(task)
}
