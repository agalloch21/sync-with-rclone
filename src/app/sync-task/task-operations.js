import { loadAppConfig, saveAppConfig } from '../app-config.js'
import { getRuntimePaths } from '../runtime-paths.js'

function taskMatchesIdentity(task, taskIdentity = {}) {
  return task.name === taskIdentity.name
    && task.rcloneRemote === taskIdentity.rcloneRemote
    && task.localBasePath === taskIdentity.localBasePath
}

export async function deleteTaskFromConfig(taskIdentity, runtimePaths = getRuntimePaths()) {
  const config = await loadAppConfig(runtimePaths.configPath)
  if (!config)
    return { success: false, error: 'Sync config does not exist.' }

  const nextTasks = config.syncTasks.filter(task => !taskMatchesIdentity(task, taskIdentity))
  if (nextTasks.length === config.syncTasks.length)
    return { success: false, error: 'Sync task was not found.' }

  await saveAppConfig({
    globalIgnorePatterns: config.globalIgnorePatterns,
    syncTasks: nextTasks,
  }, runtimePaths)

  return { success: true }
}
