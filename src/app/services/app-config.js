import {
  loadAppConfig,
  loadAppGlobalExclusionPatterns,
  loadAppMappings,
  updateAppConfig,
} from '#src/infrastructure/configuration/app-config-store.js'
import { APP_ERROR_CODE, toAppError } from '../app-errors.js'

export async function loadAppConfiguration(configPath) {
  try {
    return await loadAppConfig(configPath)
  }
  catch (error) {
    throw toAppError(
      error,
      APP_ERROR_CODE.CONFIG_LOAD_FAILED,
      'Failed to load configuration.',
      { meta: { configPath } },
    )
  }
}

export async function loadMappings(configPath) {
  try {
    return await loadAppMappings(configPath)
  }
  catch (error) {
    throw toAppError(
      error,
      APP_ERROR_CODE.CONFIG_LOAD_FAILED,
      'Failed to load mappings.',
      { meta: { configPath } },
    )
  }
}

export async function loadGlobalExclusionPatterns(configPath) {
  try {
    return await loadAppGlobalExclusionPatterns(configPath)
  }
  catch (error) {
    throw toAppError(
      error,
      APP_ERROR_CODE.CONFIG_LOAD_FAILED,
      'Failed to load global exclusion patterns.',
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
      'Failed to update configuration.',
      { meta: { configPath: runtimePaths?.configPath } },
    )
  }
}
