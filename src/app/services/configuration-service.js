import {
  loadAppConfig,
  updateAppConfig,
} from '#src/infrastructure/configuration/app-config-store.js'
import { mapInfrastructureError } from '../app-errors.js'

export async function loadConfiguration(configPath) {
  try {
    return await loadAppConfig(configPath)
  }
  catch (error) {
    throw mapInfrastructureError(error)
  }
}

export async function updateConfiguration(mutator, runtimePaths) {
  try {
    return await updateAppConfig(mutator, runtimePaths)
  }
  catch (error) {
    throw mapInfrastructureError(error)
  }
}
