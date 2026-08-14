import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { loadGlobalFilterPatterns, updateConfiguration } from './app-config.js'

export async function listGlobalFilterPatterns() {
  const filterPatterns = await loadGlobalFilterPatterns()
  if (!filterPatterns)
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Configuration file does not exist.')

  return filterPatterns
}

export async function saveGlobalFilterPatterns(filterPatterns) {
  const savedConfig = await updateConfiguration((loadedConfig) => {
    if (!loadedConfig)
      throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Configuration file does not exist.')

    return {
      ...loadedConfig,
      globalFilterPatterns: [...filterPatterns],
    }
  })

  return savedConfig.globalFilterPatterns
}
