import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { loadConfiguration, updateConfiguration } from './app-config.js'

export async function listGlobalIgnorePatterns() {
  const config = await loadConfiguration()
  return config?.globalIgnorePatterns || []
}

export async function saveGlobalIgnorePatterns(ignorePatterns) {
  const savedConfig = await updateConfiguration((loadedConfig) => {
    if (!loadedConfig)
      throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Sync configuration does not exist.')

    return {
      ...loadedConfig,
      globalIgnorePatterns: [...ignorePatterns],
    }
  })

  return savedConfig.globalIgnorePatterns
}
