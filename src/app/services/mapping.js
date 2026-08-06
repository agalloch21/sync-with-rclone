import { APP_ERROR_CODE, throwAppError } from '../app-errors.js'
import { loadConfiguration, updateConfiguration } from './app-config.js'

function requireConfig(config) {
  if (!config)
    throwAppError(APP_ERROR_CODE.CONFIG_LOAD_FAILED, 'Sync configuration does not exist.')

  return config
}

function mappingMatchesReference(candidate, mapping = {}) {
  return candidate.rcloneRemote === mapping.rcloneRemote
    && candidate.localBasePath === mapping.localBasePath
}

function findMappingIndex(mappings, mapping) {
  return mappings.findIndex(candidate => mappingMatchesReference(candidate, mapping))
}

export async function listMappings() {
  const config = await loadConfiguration()
  return config?.mappings
}

export async function createMapping(mapping) {
  const savedConfig = await updateConfiguration((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    if (findMappingIndex(config.mappings, mapping) !== -1) {
      throwAppError(APP_ERROR_CODE.MAPPING_ALREADY_EXISTS, 'A mapping already uses this server and local folder.', {
        meta: {
          rcloneRemote: mapping.rcloneRemote,
          localBasePath: mapping.localBasePath,
        },
      })
    }

    return {
      ...config,
      mappings: [...config.mappings, mapping],
    }
  })

  return savedConfig.mappings.at(-1)
}

export async function updateMapping(mapping, expectedMapping) {
  let mappingIndex
  const savedConfig = await updateConfiguration((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    mappingIndex = findMappingIndex(config.mappings, mapping)
    if (mappingIndex === -1) {
      throwAppError(APP_ERROR_CODE.MAPPING_NOT_FOUND, 'Mapping was not found.', {
        meta: mapping,
      })
    }

    const conflictingIndex = findMappingIndex(config.mappings, expectedMapping)
    if (conflictingIndex !== -1 && conflictingIndex !== mappingIndex) {
      throwAppError(APP_ERROR_CODE.MAPPING_ALREADY_EXISTS, 'A mapping already uses this server and local folder.', {
        meta: {
          rcloneRemote: expectedMapping.rcloneRemote,
          localBasePath: expectedMapping.localBasePath,
        },
      })
    }

    const nextMappings = [...config.mappings]
    nextMappings[mappingIndex] = {
      ...config.mappings[mappingIndex],
      ...expectedMapping,
    }

    return {
      ...config,
      mappings: nextMappings,
    }
  })

  return savedConfig.mappings[mappingIndex]
}

export async function updateMappingIgnorePatterns(mapping, ignorePatterns) {
  let mappingIndex
  const savedConfig = await updateConfiguration((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    mappingIndex = findMappingIndex(config.mappings, mapping)
    if (mappingIndex === -1) {
      throwAppError(APP_ERROR_CODE.MAPPING_NOT_FOUND, 'Mapping was not found.', {
        meta: mapping,
      })
    }

    const nextMappings = [...config.mappings]
    nextMappings[mappingIndex] = {
      ...config.mappings[mappingIndex],
      ignorePatterns: [...ignorePatterns],
    }

    return {
      ...config,
      mappings: nextMappings,
    }
  })

  return savedConfig.mappings[mappingIndex]
}

export async function deleteMapping(mapping) {
  let deletedMapping
  await updateConfiguration((loadedConfig) => {
    const config = requireConfig(loadedConfig)
    const mappingIndex = findMappingIndex(config.mappings, mapping)
    if (mappingIndex === -1) {
      throwAppError(APP_ERROR_CODE.MAPPING_NOT_FOUND, 'Mapping was not found.', {
        meta: mapping,
      })
    }

    deletedMapping = config.mappings[mappingIndex]
    return {
      ...config,
      mappings: config.mappings.filter((_candidate, index) => index !== mappingIndex),
    }
  })

  return deletedMapping
}
