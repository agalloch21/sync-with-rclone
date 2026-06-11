import en from '#src/electron/renderer/src/i18n/locales/en.js'
import zhCN from '#src/electron/renderer/src/i18n/locales/zh-CN.js'

const locales = {
  'zh-CN': zhCN,
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function collectLeafKeys(obj, prefix = '') {
  const keys = []

  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key

    if (isPlainObject(value)) {
      keys.push(...collectLeafKeys(value, nextKey))
    }
    else {
      keys.push(nextKey)
    }
  }

  return keys
}

function compareKeys(baseMessages, targetMessages) {
  const baseKeys = new Set(collectLeafKeys(baseMessages))
  const targetKeys = new Set(collectLeafKeys(targetMessages))

  const missing = [...baseKeys].filter(key => !targetKeys.has(key)).sort()
  const extra = [...targetKeys].filter(key => !baseKeys.has(key)).sort()

  return { missing, extra }
}

let hasError = false

for (const [locale, messages] of Object.entries(locales)) {
  const { missing, extra } = compareKeys(en, messages)

  if (missing.length === 0 && extra.length === 0) {
    console.log(`OK: ${locale}`)
    continue
  }

  hasError = true
  console.log(`\nLocale ${locale} has key mismatches:`)

  if (missing.length > 0) {
    console.log('  Missing keys:')
    for (const key of missing)
      console.log(`    - ${key}`)
  }

  if (extra.length > 0) {
    console.log('  Extra keys:')
    for (const key of extra)
      console.log(`    - ${key}`)
  }
}

if (hasError)
  process.exit(1)

console.log('\nAll locale keys are consistent.')
