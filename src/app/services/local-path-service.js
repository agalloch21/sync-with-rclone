import {
  normalizeLocalPath,
  resolveLocalDirectoryPath as resolveInfrastructureLocalDirectoryPath,
  trimTrailingSlash,
} from '#src/infrastructure/filesystem/local-path.js'
import { mapInfrastructureError } from '../app-errors.js'

export { normalizeLocalPath, trimTrailingSlash }

export function resolveLocalDirectoryPath(inputPath) {
  try {
    return resolveInfrastructureLocalDirectoryPath(inputPath)
  }
  catch (error) {
    throw mapInfrastructureError(error)
  }
}
