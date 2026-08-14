import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { loadGlobalExclusionPatterns, updateConfiguration } from './app-config.js'

export async function listGlobalExclusionPatterns() {
  const exclusionPatterns = await loadGlobalExclusionPatterns()
  if (!exclusionPatterns)
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Configuration file does not exist.')

  return exclusionPatterns
}

export async function saveGlobalExclusionPatterns(exclusionPatterns) {
  const savedConfig = await updateConfiguration((loadedConfig) => {
    if (!loadedConfig)
      throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Configuration file does not exist.')

    return {
      ...loadedConfig,
      globalExclusionPatterns: [...exclusionPatterns],
    }
  })

  return savedConfig.globalExclusionPatterns
}
