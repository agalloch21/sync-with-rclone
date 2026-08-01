import {
  loadAppConfig,
  updateAppConfig,
} from '#src/infrastructure/configuration/app-config-store.js'
import { APP_ERROR_CODE, toAppError } from '../app-errors.js'

export async function loadConfiguration(configPath) {
  try {
    return await loadAppConfig(configPath)
  }
  catch (error) {
    throw toAppError(
      error,
      APP_ERROR_CODE.CONFIG_LOAD_FAILED,
      'Failed to load sync configuration.',
      { meta: { configPath } },
    )
  }
}

export async function updateConfiguration(mutator, runtimePaths) {
  try {
    return await updateAppConfig(mutator, runtimePaths)
  }
  catch (error) {
    throw toAppError(
      error,
      APP_ERROR_CODE.CONFIG_UPDATE_FAILED,
      'Failed to update sync configuration.',
      { meta: { configPath: runtimePaths?.configPath } },
    )
  }
}
