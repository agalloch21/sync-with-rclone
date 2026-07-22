import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { APP_OPERATION } from '#src/app/operation-progress-contract.js'
import en from '#src/electron/renderer/src/i18n/locales/en.js'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
})

test('create-server progress keys match the English locale structure', () => {
  const messages = en.operationProgress[APP_OPERATION.CREATE_SERVER]

  assert.equal(messages.title, 'Creating Server')
  assert.equal(messages.steps.save, 'Saving the server configuration...')
  assert.equal(messages.steps.testConnection, 'Testing the server connection...')
  assert.equal(messages.steps.rollback, 'Something is wrong. Removing the temporary server configuration...')
})

test('Vue I18n resolves every English server error shown by the progress dialog', () => {
  const serverErrorCodes = [
    APP_ERROR_CODE.SERVER_INVALID_OPERATION,
    APP_ERROR_CODE.SERVER_VALIDATION_FAILED,
    APP_ERROR_CODE.SERVER_ALREADY_EXISTS,
    APP_ERROR_CODE.SERVER_NOT_FOUND,
    APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
    APP_ERROR_CODE.SERVER_OPERATION_FAILED,
  ]

  for (const code of serverErrorCodes) {
    const key = `errors.${code}`
    assert.notEqual(i18n.global.t(key), key, `Missing English message for ${code}`)
  }
})
