import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { expandHomeDir, resolveLocalDirectoryPath } from '#src/app/path-utils.js'

test('expandHomeDir expands ~ to the user home directory', () => {
  const homeDir = process.env.HOME?.replaceAll(path.sep, path.posix.sep) || ''
  assert.equal(expandHomeDir('~').replaceAll(path.sep, path.posix.sep), homeDir)
  assert.equal(expandHomeDir('~/docs').replaceAll(path.sep, path.posix.sep), `${homeDir}/docs`)
})

test('resolveLocalDirectoryPath validates and resolves local directory input', () => {
  assert.throws(() => resolveLocalDirectoryPath(''))

  const pwdPath = path.posix.resolve('./')
  const targetPath = path.posix.resolve('test/fixtures/local/nested')
  const relativePath = path.posix.relative(pwdPath, targetPath)
  assert.equal(resolveLocalDirectoryPath(relativePath), targetPath)
  assert.equal(resolveLocalDirectoryPath(`${relativePath}/`), targetPath)
  assert.equal(resolveLocalDirectoryPath(`${relativePath}\\`), targetPath)

  assert.throws(() => resolveLocalDirectoryPath(path.posix.resolve('test/fixtures/path-not-exsit')))
  assert.throws(() => resolveLocalDirectoryPath(path.posix.resolve('test/fixtures/local/basic/.gitignore')))
})

