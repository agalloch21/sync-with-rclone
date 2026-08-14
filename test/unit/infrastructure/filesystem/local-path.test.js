import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
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

test('resolveLocalDirectoryPath canonicalizes parent links and a linked root', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'local-path-links-'))
  const realParent = path.join(temporaryPath, 'real-parent')
  const linkedParent = path.join(temporaryPath, 'linked-parent')
  const directoryPath = path.join(realParent, 'directory')
  const rootLink = path.join(temporaryPath, 'root-link')

  try {
    await fs.mkdir(directoryPath, { recursive: true })
    try {
      await fs.symlink(realParent, linkedParent, 'dir')
      await fs.symlink(directoryPath, rootLink, 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    assert.equal(
      resolveLocalDirectoryPath(path.join(linkedParent, 'directory')),
      (await fs.realpath(directoryPath)).replaceAll(path.sep, path.posix.sep),
    )
    assert.equal(
      resolveLocalDirectoryPath(rootLink),
      (await fs.realpath(directoryPath)).replaceAll(path.sep, path.posix.sep),
    )
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})
