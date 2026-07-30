import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import * as settingsService from '../services/settings-service.js'

function assertIgnorePatterns(ignorePatterns) {
  if (!Array.isArray(ignorePatterns) || ignorePatterns.some(pattern => typeof pattern !== 'string'))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Ignore patterns must be an array of strings.')
}

export const listGlobalIgnorePatterns = settingsService.listGlobalIgnorePatterns

export async function updateGlobalIgnorePatterns(ignorePatterns) {
  assertIgnorePatterns(ignorePatterns)
  return await settingsService.saveGlobalIgnorePatterns(ignorePatterns)
}
