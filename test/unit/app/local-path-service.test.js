import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import { resolveLocalDirectoryPath } from '#src/app/services/local-path.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'

test('resolveLocalDirectoryPath wraps path failure and preserves its native cause', () => {
  const missingPath = path.resolve('test/fixtures/path-does-not-exist')

  assert.throws(() => resolveLocalDirectoryPath(missingPath), (error) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.code, APP_ERROR_CODE.PATH_INVALID)
    assert.ok(error.cause instanceof InfrastructureError)
    assert.equal(error.cause.code, INFRASTRUCTURE_ERROR_CODE.PATH_NOT_FOUND)
    assert.equal(error.cause.cause.code, 'ENOENT')
    assert.deepEqual(error.meta, {
      path: missingPath.replaceAll(path.sep, path.posix.sep),
    })
    return true
  })
})
