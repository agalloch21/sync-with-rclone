import en from '#shell/locales/en/index.js'
import zhCN from '#shell/locales/zh-CN/index.js'
import { createI18n } from 'vue-i18n'

const messages = {
  en,
  'zh-CN': zhCN,
}

export function resolveCliLocale(environment = process.env) {
  const rawLocale = environment.LC_ALL
    || environment.LC_MESSAGES
    || environment.LANG
    || 'en'
  const normalized = rawLocale
    .split('.')[0]
    .replace('_', '-')

  if (normalized.toLowerCase().startsWith('zh'))
    return 'zh-CN'

  return 'en'
}

export function createCliI18n(locale = resolveCliLocale()) {
  const resolvedLocale = Object.hasOwn(messages, locale) ? locale : 'en'
  return createI18n({
    legacy: false,
    locale: resolvedLocale,
    fallbackLocale: 'en',
    messages,
  }).global
}
