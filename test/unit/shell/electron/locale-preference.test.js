import assert from 'node:assert/strict'
import test from 'node:test'
import i18n, {
  DEFAULT_LOCALE,
  matchSupportedLocale,
  resolveLocale,
  setLocale,
} from '#frontend/i18n/index.js'

test('locale matching accepts supported locales and common regional variants', () => {
  assert.equal(matchSupportedLocale('en'), 'en')
  assert.equal(matchSupportedLocale('en-US'), 'en')
  assert.equal(matchSupportedLocale('zh-CN'), 'zh-CN')
  assert.equal(matchSupportedLocale('zh-Hans'), 'zh-CN')
  assert.equal(matchSupportedLocale('fr-FR'), null)
})

test('saved locale takes precedence over browser locale', () => {
  assert.equal(resolveLocale('en', 'zh-CN'), 'en')
  assert.equal(resolveLocale('zh-CN', 'en-US'), 'zh-CN')
})

test('locale resolution falls back to browser locale and then English', () => {
  assert.equal(resolveLocale(null, 'zh-CN'), 'zh-CN')
  assert.equal(resolveLocale('unsupported', 'en-GB'), 'en')
  assert.equal(resolveLocale(null, 'fr-FR'), DEFAULT_LOCALE)
})

test('setting the locale updates the renderer and persists the preference', () => {
  const storedValues = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => storedValues.get(key) ?? null,
      setItem: (key, value) => storedValues.set(key, value),
    },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: { lang: 'en' } },
  })

  assert.equal(setLocale('zh-CN'), true)
  assert.equal(i18n.global.locale.value, 'zh-CN')
  assert.equal(storedValues.get('sync-with-rclone.locale'), 'zh-CN')
  assert.equal(globalThis.document.documentElement.lang, 'zh-CN')
  assert.equal(setLocale('unsupported'), false)
})
