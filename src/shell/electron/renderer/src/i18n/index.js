import { createI18n } from 'vue-i18n'
import en from './locales/en/index.js'
import zhCN from './locales/zh-CN/index.js'

export const DEFAULT_LOCALE = 'en'
export const LOCALE_STORAGE_KEY = 'sync-with-rclone.locale'
export const SUPPORTED_LOCALES = Object.freeze(['en', 'zh-CN'])

const messages = {
  en,
  'zh-CN': zhCN,
}

export function matchSupportedLocale(locale) {
  if (typeof locale !== 'string' || !locale)
    return null

  const exactMatch = SUPPORTED_LOCALES.find(supportedLocale => supportedLocale.toLowerCase() === locale.toLowerCase())
  if (exactMatch)
    return exactMatch

  const baseLocale = locale.split('-')[0].toLowerCase()
  if (baseLocale === 'zh')
    return 'zh-CN'
  if (baseLocale === 'en')
    return 'en'

  return null
}

export function resolveLocale(preferredLocale, browserLocale) {
  return matchSupportedLocale(preferredLocale)
    || matchSupportedLocale(browserLocale)
    || DEFAULT_LOCALE
}

function readLocalePreference() {
  try {
    return globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
  }
  catch {
    return null
  }
}

function writeLocalePreference(locale) {
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale)
  }
  catch {
    // The selected locale still applies for the current window when storage is unavailable.
  }
}

function updateDocumentLocale(locale) {
  if (globalThis.document?.documentElement)
    globalThis.document.documentElement.lang = locale
}

const i18n = createI18n(
  {
    legacy: false,
    locale: resolveLocale(readLocalePreference(), globalThis.navigator?.language),
    fallbackLocale: 'en',
    messages,
  },
)

export function setLocale(locale, { persist = true } = {}) {
  const supportedLocale = matchSupportedLocale(locale)
  if (!supportedLocale)
    return false

  i18n.global.locale.value = supportedLocale
  updateDocumentLocale(supportedLocale)
  if (persist)
    writeLocalePreference(supportedLocale)

  return true
}

updateDocumentLocale(i18n.global.locale.value)
globalThis.addEventListener?.('storage', (event) => {
  if (event.key === LOCALE_STORAGE_KEY)
    setLocale(event.newValue, { persist: false })
})

export default i18n
