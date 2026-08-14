import ignore from 'ignore'

function normalizePatterns(patterns) {
  if (!Array.isArray(patterns))
    throw new TypeError('Sync filter patterns must be an array of strings.')

  return patterns.map((pattern) => {
    if (typeof pattern !== 'string')
      throw new TypeError('Sync filter patterns must be an array of strings.')

    const normalizedPattern = pattern.trim()
    if (!normalizedPattern)
      throw new TypeError('Sync filter patterns must not be empty.')
    if (normalizedPattern.startsWith('!'))
      throw new TypeError('Sync filter patterns do not support negation.')
    if (normalizedPattern.startsWith('#'))
      throw new TypeError('Sync filter patterns do not support comments.')

    return normalizedPattern
  })
}

function toRcloneExcludePatterns(pattern) {
  const directoryPattern = pattern.endsWith('/')
    ? `${pattern.slice(0, -1)}/**`
    : `${pattern}/**`

  return pattern.endsWith('/')
    ? [directoryPattern]
    : [pattern, directoryPattern]
}

export function createSyncFilter(patterns = []) {
  const normalizedPatterns = normalizePatterns(patterns)
  const matcher = ignore().add(normalizedPatterns)

  return {
    patterns: normalizedPatterns,
    rcloneExcludePatterns: [...new Set(normalizedPatterns.flatMap(toRcloneExcludePatterns))],
    ignores(entryPath, isDirectory = false) {
      const pathToFilter = `${entryPath}${isDirectory && !entryPath.endsWith('/') ? '/' : ''}`
      return matcher.ignores(pathToFilter)
    },
  }
}
