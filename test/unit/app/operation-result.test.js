import assert from 'node:assert/strict'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import { toFailureResult } from '#src/app/operation-result.js'

test('toFailureResult serializes application and unexpected errors without presentation policy', () => {
  const applicationFailure = toFailureResult(new AppError({
    code: APP_ERROR_CODE.SERVER_NOT_FOUND,
    message: 'Server not found.',
    meta: { serverName: 'synology' },
  }))
  const unexpectedFailure = toFailureResult(new Error('Socket closed.'))

  assert.equal(Object.hasOwn(applicationFailure.error, 'expected'), false)
  assert.equal(Object.hasOwn(unexpectedFailure.error, 'expected'), false)
  assert.equal(applicationFailure.error.code, APP_ERROR_CODE.SERVER_NOT_FOUND)
  assert.deepEqual(applicationFailure.error.meta, { serverName: 'synology' })
  assert.equal(unexpectedFailure.error.message, 'Socket closed.')
})
