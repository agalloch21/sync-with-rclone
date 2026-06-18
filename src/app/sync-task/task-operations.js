import { loadAppConfig, saveAppConfig } from '../app-config.js'
import { getRuntimePaths } from '../runtime-paths.js'

function taskMatchesReference(task, taskReference = {}) {
  return task.rcloneRemote === taskReference.rcloneRemote
    && task.localBasePath === taskReference.localBasePath
}

export async function deleteTaskFromConfig(taskReference, runtimePaths = getRuntimePaths()) {
  const config = await loadAppConfig(runtimePaths.configPath)
  if (!config)
    return { success: false, error: 'Sync config does not exist.' }

  const nextTasks = config.syncTasks.filter(task => !taskMatchesReference(task, taskReference))
  if (nextTasks.length === config.syncTasks.length)
    return { success: false, error: 'Sync task was not found.' }

  await saveAppConfig({
    globalIgnorePatterns: config.globalIgnorePatterns,
    syncTasks: nextTasks,
  }, runtimePaths)

  return { success: true }
}
