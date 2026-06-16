import {
  deleteRcloneRemote,
  testRcloneRemote,
  updateRcloneRemoteConfig,
  writeRcloneRemote,
} from '../rclone-config.js'

export function findTasksUsingRemote(config, remoteName) {
  return (config?.syncTasks || []).filter(task => task.rcloneRemote === remoteName)
}

export function createRemoteConfig(remote, runtimePaths) {
  return writeRcloneRemote(remote, runtimePaths)
}

export function updateRemoteConfig(remote, runtimePaths) {
  return updateRcloneRemoteConfig(remote, runtimePaths)
}

export function deleteRemoteConfig(remoteName, runtimePaths) {
  return deleteRcloneRemote(remoteName, runtimePaths)
}

export function testRemoteConnection(remoteName, runtimePaths) {
  return testRcloneRemote(remoteName, runtimePaths)
}
