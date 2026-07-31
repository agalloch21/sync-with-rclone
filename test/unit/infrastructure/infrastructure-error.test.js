import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'

test('infrastructure error codes are unique stable contract values', () => {
  const codes = Object.values(INFRASTRUCTURE_ERROR_CODE)

  assert.equal(new Set(codes).size, codes.length)
  assert.ok(codes.every(code => /^[a-z_]+(?:\.[a-z_]+)+$/.test(code)))
})

test('InfrastructureError preserves its native cause and diagnostics', () => {
  const nativeError = Object.assign(new Error('no such file'), { code: 'ENOENT' })
  const error = new InfrastructureError(
    INFRASTRUCTURE_ERROR_CODE.PATH_NOT_FOUND,
    'Path does not exist.',
    {
      cause: nativeError,
      detail: nativeError.message,
      meta: { path: '/missing' },
    },
  )

  assert.equal(error.cause, nativeError)
  assert.equal(error.detail, 'no such file')
  assert.deepEqual(error.meta, { path: '/missing' })
})

test('InfrastructureError rejects undeclared codes', () => {
  assert.throws(
    () => new InfrastructureError('undeclared.failure', 'Failure.'),
    /Unknown infrastructure error code/,
  )
})
