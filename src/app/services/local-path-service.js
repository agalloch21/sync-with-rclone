import {
  normalizeLocalPath,
  resolveLocalDirectoryPath as resolveInfrastructureLocalDirectoryPath,
  trimTrailingSlash,
} from '#src/infrastructure/filesystem/local-path.js'
import { APP_ERROR_CODE, toAppError } from '../app-errors.js'

export { normalizeLocalPath, trimTrailingSlash }

export function resolveLocalDirectoryPath(inputPath) {
  try {
    return resolveInfrastructureLocalDirectoryPath(inputPath)
  }
  catch (error) {
    throw toAppError(
      error,
      APP_ERROR_CODE.PATH_INVALID,
      'Invalid local directory path.',
    )
  }
}
