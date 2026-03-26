import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { resolvePath } from '#src/core/path-resolver.js'

test('resolvePath validation', () => {
  // input path can not be empty
  assert.throws(() => resolvePath(''))

  // input path can be relative but output path must be absolute
  const pwdPath = path.posix.resolve('./')
  const destPath = path.posix.resolve('test/fixtures/scan/nested')
  const relPath = path.posix.relative(pwdPath, destPath)
  assert.equal(resolvePath(relPath), destPath)

  // input path can either end with '/' or not
  assert.equal(resolvePath(`${relPath}/`), destPath)
  assert.equal(resolvePath(`${relPath}\\`), destPath)

  // input path must point to an exsiting folder
  assert.throws(() => resolvePath(path.posix.resolve('test/fixtures/path-not-exsit')))
  assert.throws(() => resolvePath(path.posix.resolve('test/fixtures/scan/basic/nested/top.txt')))
})
