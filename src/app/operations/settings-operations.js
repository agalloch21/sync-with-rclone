import { loadAppConfig, updateAppConfig } from '#src/infrastructure/configuration/app-config-store.js'
import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'

function assertIgnorePatterns(ignorePatterns) {
  if (!Array.isArray(ignorePatterns) || ignorePatterns.some(pattern => typeof pattern !== 'string'))
    throwAppError(APP_ERROR_CODE.IPC_INVALID_PAYLOAD, 'Ignore patterns must be an array of strings.')
}

export async function listGlobalIgnorePatterns() {
  const config = await loadAppConfig()
  return config?.globalIgnorePatterns || []
}

export async function updateGlobalIgnorePatterns(ignorePatterns) {
  assertIgnorePatterns(ignorePatterns)

  const savedConfig = await updateAppConfig((loadedConfig) => {
    if (!loadedConfig)
      throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Sync configuration does not exist.')

    return {
      ...loadedConfig,
      globalIgnorePatterns: [...ignorePatterns],
    }
  })

  return savedConfig.globalIgnorePatterns
}
