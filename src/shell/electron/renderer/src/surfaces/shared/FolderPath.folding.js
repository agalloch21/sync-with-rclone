function normalizePath(path) {
  if (!path)
    return ''

  const withoutTrailingSeparators = path.replace(/[\\/]+$/, '')
  return withoutTrailingSeparators || path
}

function parsePath(path) {
  const normalized = normalizePath(path)
  const separator = normalized.includes('\\') ? '\\' : '/'
  const leadingSeparator = normalized.match(/^[\\/]+/)?.[0] || ''
  const segments = normalized.split(/[\\/]+/).filter(Boolean)

  return {
    normalized,
    separator,
    leadingSeparator,
    segments,
  }
}

function joinSegments(segments, separator, leadingSeparator = '') {
  return `${leadingSeparator}${segments.join(separator)}`
}

export function getFolderPathFoldingCandidates(path, foldStrategy = 'leading') {
  const {
    normalized,
    separator,
    leadingSeparator,
    segments,
  } = parsePath(path)

  if (!normalized)
    return ['']

  const candidates = [path]
  const trailingSegment = segments.at(-1) || normalized

  if (segments.length >= 2 && foldStrategy === 'leading') {
    for (let index = 1; index < segments.length; index += 1) {
      candidates.push(joinSegments([
        '...',
        ...segments.slice(index),
      ], separator))
    }

    candidates.push(trailingSegment)
  }
  else if (segments.length >= 2) {
    const leadingSegment = `${leadingSeparator}${segments[0]}`
    const middleSegments = segments.slice(1, -1)

    for (let keptMiddleCount = middleSegments.length - 1; keptMiddleCount >= 0; keptMiddleCount -= 1) {
      const higherPrioritySegments = middleSegments.slice(middleSegments.length - keptMiddleCount)
      candidates.push(joinSegments([
        leadingSegment,
        '...',
        ...higherPrioritySegments,
        trailingSegment,
      ], separator))
    }

    candidates.push(`...${separator}${trailingSegment}`)
    candidates.push(trailingSegment)
  }

  for (let visibleLength = trailingSegment.length - 1; visibleLength >= 0; visibleLength -= 1)
    candidates.push(`${trailingSegment.slice(0, visibleLength)}...`)

  return [...new Set(candidates)]
}
