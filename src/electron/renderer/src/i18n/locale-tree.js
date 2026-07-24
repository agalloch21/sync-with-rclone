function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function cloneLocaleValue(value) {
  if (Array.isArray(value))
    return value.map(cloneLocaleValue)
  if (!isPlainObject(value))
    return value

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneLocaleValue(child)]),
  )
}

function getCodeSegments(code) {
  if (typeof code !== 'string' || code.length === 0)
    throw new TypeError('Locale code must be a non-empty string.')

  const segments = code.split('.')
  if (segments.some(segment => segment.length === 0))
    throw new TypeError(`Locale code contains an empty segment: ${code}`)
  if (segments.some(segment => ['__proto__', 'constructor', 'prototype'].includes(segment)))
    throw new TypeError(`Locale code contains an unsafe segment: ${code}`)

  return segments
}

export function defineLocaleTree(entries) {
  if (!isPlainObject(entries))
    throw new TypeError('Locale entries must be a plain object.')

  const tree = {}

  for (const [code, value] of Object.entries(entries)) {
    const segments = getCodeSegments(code)
    let target = tree

    for (const [index, segment] of segments.entries()) {
      const isLeaf = index === segments.length - 1

      if (isLeaf) {
        if (Object.hasOwn(target, segment))
          throw new TypeError(`Locale code conflicts with another path: ${code}`)
        target[segment] = cloneLocaleValue(value)
        continue
      }

      if (!Object.hasOwn(target, segment))
        target[segment] = {}
      else if (!isPlainObject(target[segment]))
        throw new TypeError(`Locale code extends an existing value: ${code}`)

      target = target[segment]
    }
  }

  return tree
}
