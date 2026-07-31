import assert from 'node:assert/strict'
import test from 'node:test'
import { createCliI18n, resolveCliLocale } from '#cli/i18n.js'
import { createCliOperationReportDisplay } from '#cli/operation-report-display.js'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'
import {
  SERVER_CREATE_PROGRESS_STEP,
  SERVER_OPERATION,
} from '#src/app/operations/server-operation-contract.js'

function createOutput() {
  const lines = []
  const errors = []
  return {
    lines,
    errors,
    log(message) {
      lines.push(message)
    },
    error(message) {
      errors.push(message)
    },
  }
}

test('CLI operation report display renders reporter states through Vue I18n', async () => {
  const output = createOutput()
  const reporter = createOperationReporter(
    SERVER_OPERATION.CREATE,
    createCliOperationReportDisplay({
      output,
      i18n: createCliI18n('en'),
    }),
  )

  reporter.step(SERVER_CREATE_PROGRESS_STEP.TEST_CONNECTION)
  await reporter.succeed(true)

  assert.deepEqual(output.lines, [
    'Preparing server creation...',
    'Testing the server connection...',
    'The server was created successfully.',
  ])
  assert.deepEqual(output.errors, [])
})

test('CLI operation report display supports Chinese and translated errors', async () => {
  const output = createOutput()
  const reporter = createOperationReporter(
    SERVER_OPERATION.CREATE,
    createCliOperationReportDisplay({
      output,
      i18n: createCliI18n('zh-CN'),
    }),
  )

  await reporter.error(new AppError({
    code: APP_ERROR_CODE.SERVER_CONNECTION_FAILED,
    message: 'Connection failed.',
  }))

  assert.deepEqual(output.lines, ['正在准备创建服务器…'])
  assert.deepEqual(output.errors, ['服务器连接失败。', 'Connection failed.'])
})

test('CLI locale resolution follows terminal locale environment variables', () => {
  assert.equal(resolveCliLocale({ LANG: 'zh_CN.UTF-8' }), 'zh-CN')
  assert.equal(resolveCliLocale({ LC_ALL: 'en_US.UTF-8', LANG: 'zh_CN.UTF-8' }), 'en')
  assert.equal(resolveCliLocale({}), 'en')
})
