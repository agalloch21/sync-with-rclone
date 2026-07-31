import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { expandHomeDir, resolveLocalDirectoryPath } from '#src/infrastructure/filesystem/local-path.js'
import { INFRASTRUCTURE_ERROR_CODE } from '#src/infrastructure/infrastructure-error.js'

test('expandHomeDir expands ~ to the user home directory', () => {
  const homeDir = os.homedir().replaceAll(path.sep, path.posix.sep)
  assert.equal(expandHomeDir('~').replaceAll(path.sep, path.posix.sep), homeDir)
  assert.equal(expandHomeDir('~/docs').replaceAll(path.sep, path.posix.sep), `${homeDir}/docs`)
})

test('resolveLocalDirectoryPath validates and resolves local directory input', () => {
  assert.throws(() => resolveLocalDirectoryPath(''), {
    name: 'InfrastructureError',
    code: INFRASTRUCTURE_ERROR_CODE.PATH_EMPTY,
  })

  const pwdPath = path.resolve('./')
  const targetPath = path.resolve('test/fixtures/local/nested').replaceAll(path.sep, path.posix.sep)
  const relativePath = path.relative(pwdPath, path.resolve('test/fixtures/local/nested'))
  assert.equal(resolveLocalDirectoryPath(relativePath), targetPath)
  assert.equal(resolveLocalDirectoryPath(`${relativePath}/`), targetPath)
  assert.equal(resolveLocalDirectoryPath(`${relativePath}\\`), targetPath)

  assert.throws(() => resolveLocalDirectoryPath(path.resolve('test/fixtures/path-not-exsit')), {
    name: 'InfrastructureError',
    code: INFRASTRUCTURE_ERROR_CODE.PATH_NOT_FOUND,
  })
  assert.throws(() => resolveLocalDirectoryPath(path.resolve('test/fixtures/local/basic/.gitignore')), {
    name: 'InfrastructureError',
    code: INFRASTRUCTURE_ERROR_CODE.PATH_NOT_DIRECTORY,
  })
})

test('resolveLocalDirectoryPath preserves absolute Windows-style paths', () => {
  const absoluteWindowsPath = path.resolve('test/fixtures/local/nested')
  assert.equal(
    resolveLocalDirectoryPath(absoluteWindowsPath),
    absoluteWindowsPath.replaceAll(path.sep, path.posix.sep),
  )
})
