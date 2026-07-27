import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_MESSAGE_CODE } from '#src/app/app-messages.js'
import {
  SERVER_OPERATION,
  SERVER_OPERATION_PROGRESS_STEPS,
} from '#src/app/operations/server-operation-contract.js'
import {
  SYNC_TASK_OPERATION,
  SYNC_TASK_OPERATION_PROGRESS_STEPS,
  SYNC_TASK_RETARGET_PROGRESS_STEP,
} from '#src/app/operations/task-operation-contract.js'
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

const operations = [
  ...Object.values(SERVER_OPERATION),
  ...Object.values(SYNC_TASK_OPERATION),
]
const operationProgressSteps = {
  ...SERVER_OPERATION_PROGRESS_STEPS,
  ...SYNC_TASK_OPERATION_PROGRESS_STEPS,
  [SERVER_OPERATION.UPDATE]: {
    ...SERVER_OPERATION_PROGRESS_STEPS[SERVER_OPERATION.UPDATE],
    ...SYNC_TASK_RETARGET_PROGRESS_STEP,
  },
}

test('English and Chinese stable locale keys match while new operation copy is pending translation', () => {
  const { operations: _englishOperations, ...englishStableLocale } = en
  const { operations: _chineseOperations, ...chineseStableLocale } = zhCN
  assert.deepEqual(collectLeafPaths(chineseStableLocale).sort(), collectLeafPaths(englishStableLocale).sort())
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

test('English resolves every operation state and declared step', () => {
  const hasTranslation = createTranslator('en', en)
  for (const operation of operations) {
    assert.equal(hasTranslation(`operations.${operation}.title`), true, `Missing en operation title: ${operation}`)
    assert.equal(hasTranslation(`operations.${operation}.message`), true, `Missing en operation message: ${operation}`)
    assert.equal(hasTranslation(`operations.${operation}.succeeded.message`), true, `Missing en operation success: ${operation}`)
    for (const step of Object.values(operationProgressSteps[operation] || {})) {
      assert.equal(
        hasTranslation(`operations.${operation}.steps.${step}`),
        true,
        `Missing en operation step: ${operation}.${step}`,
      )
    }
  }
})
