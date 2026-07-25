import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import { APP_OPERATION, OPERATION_PROGRESS_STEPS } from '#src/app/operation-reporter.js'
import en from '#src/electron/renderer/src/i18n/locales/en/index.js'
import zhCN from '#src/electron/renderer/src/i18n/locales/zh-CN/index.js'
import { createI18n } from 'vue-i18n'

function collectLeafPaths(value, basePath = '') {
  if (value === null || typeof value !== 'object')
    return [basePath]

  return Object.entries(value)
    .flatMap(([key, child]) => collectLeafPaths(child, basePath ? `${basePath}.${key}` : key))
}

function createTranslator(locale, messages) {
  const i18n = createI18n({ legacy: false, locale, messages: { [locale]: messages } })
  return key => i18n.global.te(key)
}

test('English and Chinese locales have identical key structure', () => {
  assert.deepEqual(collectLeafPaths(zhCN).sort(), collectLeafPaths(en).sort())
})

for (const [locale, messages] of [['en', en], ['zh-CN', zhCN]]) {
  test(`${locale} resolves every application error code`, () => {
    const hasTranslation = createTranslator(locale, messages)
    for (const code of Object.values(APP_ERROR_CODE))
      assert.equal(hasTranslation(`errors.${code}`), true, `Missing ${locale} error: ${code}`)
  })

  test(`${locale} resolves every UI message code`, () => {
    const hasTranslation = createTranslator(locale, messages)
    for (const code of Object.values(APP_MESSAGE_CODE))
      assert.equal(hasTranslation(`messages.${code}.message`), true, `Missing ${locale} message: ${code}`)
  })

  test(`${locale} resolves every operation state and declared step`, () => {
    const hasTranslation = createTranslator(locale, messages)
    for (const operation of Object.values(APP_OPERATION)) {
      assert.equal(hasTranslation(`operations.${operation}.title`), true, `Missing ${locale} operation title: ${operation}`)
      assert.equal(hasTranslation(`operations.${operation}.message`), true, `Missing ${locale} operation message: ${operation}`)
      assert.equal(hasTranslation(`operations.${operation}.succeeded.message`), true, `Missing ${locale} operation success: ${operation}`)
      for (const step of Object.values(OPERATION_PROGRESS_STEPS[operation] || {})) {
        assert.equal(
          hasTranslation(`operations.${operation}.steps.${step}`),
          true,
          `Missing ${locale} operation step: ${operation}.${step}`,
        )
      }
    }
  })
}
