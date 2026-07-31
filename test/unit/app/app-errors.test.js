import assert from 'node:assert/strict'
import test from 'node:test'
import {
  APP_ERROR_CODE,
  AppError,
  toAppError,
} from '#src/app/app-errors.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'

test('toAppError wraps a capability failure and preserves the complete cause chain', () => {
  const nativeError = Object.assign(new Error('no such file'), { code: 'ENOENT' })
  const infrastructureError = new InfrastructureError(
    INFRASTRUCTURE_ERROR_CODE.PATH_NOT_FOUND,
    'Path does not exist: /missing',
    {
      cause: nativeError,
      detail: nativeError.message,
      meta: { path: '/missing' },
    },
  )

  const applicationError = toAppError(
    infrastructureError,
    APP_ERROR_CODE.PATH_INVALID,
    'Invalid local directory path.',
  )

  assert.ok(applicationError instanceof AppError)
  assert.equal(applicationError.code, APP_ERROR_CODE.PATH_INVALID)
  assert.equal(applicationError.message, 'Invalid local directory path.')
  assert.deepEqual(applicationError.meta, { path: '/missing' })
  assert.equal(applicationError.cause, infrastructureError)
  assert.equal(applicationError.cause.cause, nativeError)
})

test('toAppError uses caller capability instead of a matching lower-level code', () => {
  const nativeError = Object.assign(new Error('native failure'), {
    code: APP_ERROR_CODE.PATH_NOT_FOUND,
  })
  const applicationError = toAppError(
    nativeError,
    APP_ERROR_CODE.SYNC_EXECUTION_FAILED,
    'Synchronization failed.',
  )

  assert.equal(applicationError.code, APP_ERROR_CODE.SYNC_EXECUTION_FAILED)
  assert.equal(applicationError.message, 'Synchronization failed.')
  assert.equal(applicationError.cause, nativeError)
})

test('toAppError does not wrap an existing AppError', () => {
  const expectedError = new AppError({
    code: APP_ERROR_CODE.SERVER_NOT_FOUND,
    message: 'Server does not exist.',
  })

  assert.equal(
    toAppError(expectedError, APP_ERROR_CODE.SERVER_OPERATION_FAILED, 'Server operation failed.'),
    expectedError,
  )
})
