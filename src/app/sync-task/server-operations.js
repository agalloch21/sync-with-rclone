import {
  createRcloneRemote,
  deleteRcloneRemote,
  testRcloneRemote,
  updateRcloneRemote,
} from '../rclone-config.js'

export function findTasksUsingRemote(config, remoteName) {
  return (config?.syncTasks || []).filter(task => task.rcloneRemote === remoteName)
}

export function checkRemoteDeletion(config, remoteName) {
  const referencedTasks = findTasksUsingRemote(config, remoteName)
  if (referencedTasks.length === 0)
    return { success: true }

  return {
    success: false,
    code: 'server.in_use',
    message: 'Server is still used by sync tasks.',
    detail: `This server is used by ${referencedTasks.length} sync task(s). Delete or move those tasks first.`,
  }
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
