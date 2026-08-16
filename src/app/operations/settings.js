import { normalizeExclusionPatterns } from '#src/core/exclusions.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import * as settingsService from '../services/global-settings.js'

function normalizeExclusionInput(exclusionPatterns) {
  try {
    return normalizeExclusionPatterns(exclusionPatterns)
  }
  catch (error) {
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, error.message, { cause: error })
  }
}

export const listGlobalExclusionPatterns = settingsService.listGlobalExclusionPatterns

export async function updateGlobalExclusionPatterns(exclusionPatterns) {
  const normalizedPatterns = normalizeExclusionInput(exclusionPatterns)
  return await settingsService.saveGlobalExclusionPatterns(normalizedPatterns)
}
