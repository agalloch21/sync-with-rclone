export function getRcloneExecutable(runtimePaths = {}) {
  return runtimePaths.bundledRclonePath || 'rclone'
}

export function buildRcloneArgs(runtimePaths = {}, commandArgs = []) {
  const args = []

  if (runtimePaths.rcloneConfigPath)
    args.push('--config', runtimePaths.rcloneConfigPath)

  args.push(...commandArgs)
  return args
}

