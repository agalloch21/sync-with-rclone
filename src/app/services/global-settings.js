import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { loadGlobalIgnorePatterns, updateConfiguration } from './app-config.js'

export async function listGlobalIgnorePatterns() {
  const ignorePatterns = await loadGlobalIgnorePatterns()
  if (!ignorePatterns)
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Configuration file does not exist.')

  return ignorePatterns
}

export async function saveGlobalIgnorePatterns(ignorePatterns) {
  const savedConfig = await updateConfiguration((loadedConfig) => {
    if (!loadedConfig)
      throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Configuration file does not exist.')

    return {
      ...loadedConfig,
      globalIgnorePatterns: [...ignorePatterns],
    }
  })

  return savedConfig.globalIgnorePatterns
}
