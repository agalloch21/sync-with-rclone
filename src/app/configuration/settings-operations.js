import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import * as appConfig from './app-config.js'

function assertIgnorePatterns(ignorePatterns) {
  if (!Array.isArray(ignorePatterns) || ignorePatterns.some(pattern => typeof pattern !== 'string'))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Ignore patterns must be an array of strings.')
}

export async function listGlobalIgnorePatterns() {
  return await appConfig.listGlobalIgnorePatterns()
}

export async function updateGlobalIgnorePatterns(ignorePatterns) {
  assertIgnorePatterns(ignorePatterns)

  return await appConfig.updateGlobalIgnorePatterns(ignorePatterns)
}
