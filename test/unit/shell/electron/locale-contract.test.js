import assert from 'node:assert/strict'
import test from 'node:test'
import en from '#frontend/i18n/locales/en/index.js'
import zhCN from '#frontend/i18n/locales/zh-CN/index.js'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  MAPPING_OPERATION,
  MAPPING_OPERATION_PROGRESS_STEPS,
} from '#src/app/contracts/mapping.js'
import {
  SERVER_OPERATION,
  SERVER_OPERATION_PROGRESS_STEPS,
} from '#src/app/contracts/server.js'
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

const operations = [
  ...Object.values(SERVER_OPERATION),
  ...Object.values(MAPPING_OPERATION),
]
const operationProgressSteps = {
  ...SERVER_OPERATION_PROGRESS_STEPS,
  ...MAPPING_OPERATION_PROGRESS_STEPS,
}

test('English and Chinese locale keys match', () => {
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
}

for (const [locale, messages] of [['en', en], ['zh-CN', zhCN]]) {
  test(`${locale} resolves every operation state and declared step`, () => {
    const hasTranslation = createTranslator(locale, messages)
    for (const operation of operations) {
      assert.equal(hasTranslation(`operations.${operation}.title`), true, `Missing ${locale} operation title: ${operation}`)
      assert.equal(hasTranslation(`operations.${operation}.message`), true, `Missing ${locale} operation message: ${operation}`)
      assert.equal(hasTranslation(`operations.${operation}.succeeded.message`), true, `Missing ${locale} operation success: ${operation}`)
      for (const step of Object.values(operationProgressSteps[operation] || {})) {
        assert.equal(
          hasTranslation(`operations.${operation}.steps.${step}`),
          true,
          `Missing ${locale} operation step: ${operation}.${step}`,
        )
      }
    }
  })
}
