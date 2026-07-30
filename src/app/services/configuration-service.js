import { loadAppConfig } from '#src/infrastructure/configuration/app-config-store.js'

export async function loadConfiguration(configPath) {
  return await loadAppConfig(configPath)
}
