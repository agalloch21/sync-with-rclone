import { createI18n } from 'vue-i18n'
import en from './locales/en.js'
import zhCN from './locales/zh-CN.js'

const messages = {
  en,
  'zh-CN': zhCN,
}

function resolveLocale() {
  const browserLocale = globalThis?.navigator?.language

  if (!browserLocale)
    return 'en'

  if (messages[browserLocale])
    return browserLocale

  const baseLocale = browserLocale.split('-')[0]
  if (messages[baseLocale])
    return baseLocale

  return 'en'
}

const i18n = createI18n(
  {
    legacy: false,
    locale: resolveLocale(),
    fallbackLocale: 'en',
    messages,
  },
)

export default i18n
