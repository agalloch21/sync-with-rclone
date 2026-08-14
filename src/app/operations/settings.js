import { createSyncFilter } from '#src/core/filters/sync-filter.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import * as settingsService from '../services/global-settings.js'

function assertFilterPatterns(filterPatterns) {
  try {
    createSyncFilter(filterPatterns)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, error.message, { cause: error })
  }
}

export const listGlobalFilterPatterns = settingsService.listGlobalFilterPatterns

export async function updateGlobalFilterPatterns(filterPatterns) {
  assertFilterPatterns(filterPatterns)
  return await settingsService.saveGlobalFilterPatterns(filterPatterns)
}
