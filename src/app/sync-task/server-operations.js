import {
  createRcloneRemote,
  deleteRcloneRemote,
  testRcloneRemote,
  updateRcloneRemote,
} from '../rclone-config.js'

export function findTasksUsingRemote(config, remoteName) {
  return (config?.syncTasks || []).filter(task => task.rcloneRemote === remoteName)
}

export function createRemoteConfig(remote, runtimePaths) {
  return createRcloneRemote(remote, runtimePaths)
}

export function updateRemoteConfig(remote, runtimePaths) {
  return updateRcloneRemote(remote, runtimePaths)
}

export function deleteRemoteConfig(remoteName, runtimePaths) {
  return deleteRcloneRemote(remoteName, runtimePaths)
}

export function testRemoteConnection(remoteName, runtimePaths) {
  return testRcloneRemote(remoteName, runtimePaths)
}
