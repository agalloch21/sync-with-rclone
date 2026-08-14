import ignore from 'ignore'

export function normalizeExclusionPatterns(patterns) {
  if (!Array.isArray(patterns))
    throw new TypeError('Exclusion patterns must be an array of strings.')

  return patterns.map((pattern) => {
    if (typeof pattern !== 'string')
      throw new TypeError('Exclusion patterns must be an array of strings.')

    const normalizedPattern = pattern.trim()
    if (!normalizedPattern)
      throw new TypeError('Exclusion patterns must not be empty.')
    if (normalizedPattern.startsWith('!'))
      throw new TypeError('Exclusion patterns do not support negation.')
    if (normalizedPattern.startsWith('#'))
      throw new TypeError('Exclusion patterns do not support comments.')

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

export function createExclusions(patterns = []) {
  const normalizedPatterns = normalizeExclusionPatterns(patterns)
  const matcher = ignore().add(normalizedPatterns)

  return {
    patterns: normalizedPatterns,
    rcloneExcludePatterns: [...new Set(normalizedPatterns.flatMap(toRcloneExcludePatterns))],
    excludes(entryPath, isDirectory = false) {
      const pathToMatch = `${entryPath}${isDirectory && !entryPath.endsWith('/') ? '/' : ''}`
      return matcher.ignores(pathToMatch)
    },
  }
}
