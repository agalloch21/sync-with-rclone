import { loadConfig } from './load-config.js'
import { getRcloneRemoteAddress, listRcloneRemotes } from './rclone-config.js'
import { getRuntimePaths } from './runtime-paths.js'

function sortByServerThenName(left, right) {
  const remoteCompare = left.rcloneRemote.localeCompare(right.rcloneRemote)
  if (remoteCompare !== 0)
    return remoteCompare

  return left.name.localeCompare(right.name)
}

export function sortSyncTasks(syncTasks = []) {
  return [...syncTasks].sort(sortByServerThenName)
}

export function createServersFromSyncTasks(rcloneRemotes = [], syncTasks = []) {
  const serverByName = new Map(rcloneRemotes.map((remote) => {
    const { name, type = '', ...options } = remote || {}

    return [name, {
      name,
      type,
      address: getRcloneRemoteAddress(options),
      options,
      status: 'unknown',
    }]
  }))

  for (const task of syncTasks) {
    if (!serverByName.has(task.rcloneRemote)) {
      serverByName.set(task.rcloneRemote, {
        name: task.rcloneRemote,
        type: null,
        address: '',
        options: {},
        status: 'missing',
      })
    }
  }

  return [...serverByName.values()].sort((left, right) => left.name.localeCompare(right.name))
}

export async function loadAppModel(runtimePaths = getRuntimePaths(), runtime = {}) {
  const config = await loadConfig(runtimePaths.configPath)
  const rcloneRemotes = await listRcloneRemotes(runtimePaths, runtime)
  const syncTasks = sortSyncTasks(config?.syncTasks || [])

  return {
    configPath: config?.path || runtimePaths.configPath,
    rcloneConfigPath: runtimePaths.rcloneConfigPath,
    globalIgnorePatterns: config?.globalIgnorePatterns || [],
    syncTasks,
    servers: createServersFromSyncTasks(rcloneRemotes, syncTasks),
  }
}

export async function listSyncTasks(runtimePaths = getRuntimePaths(), runtime = {}) {
  const model = await loadAppModel(runtimePaths, runtime)
  return model.syncTasks
}
