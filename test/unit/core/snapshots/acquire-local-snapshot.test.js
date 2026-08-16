import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createExclusions } from '#src/core/exclusions.js'
import { buildLocalSnapshot } from '#src/core/snapshots/acquire-snapshots.js'
import { createTemporaryDirectory, writeFixtureFiles } from '#test/helpers/temporary-files.js'

const NO_EXCLUSIONS = createExclusions()

function filePaths(snapshot) {
  return snapshot.files.map(file => file.path)
}

async function createNegationFixture(t) {
  const rootPath = await createTemporaryDirectory(t, 'local-negation-')
  await writeFixtureFiles(rootPath, {
    '.gitignore': [
      '.pnp.*',
      '.yarn/*',
      '!.yarn/patches',
      '',
      '.env',
      '.env.*',
      '!.env.example',
      '',
      'folder-a',
    ].join('\n'),
    '.env.simple': '',
    '.env.example': '',
    '.yarn/yarn-file': '',
    '.yarn/patches/patch-file': '',
    'folder-a/file.txt': '',
  })
  return rootPath
}

test('buildLocalSnapshot emits a serializable file-only snapshot', async (t) => {
  const rootPath = await createTemporaryDirectory(t, 'local-snapshot-')
  await writeFixtureFiles(rootPath, {
    'folder-a/a.txt': '',
    'deeper-nested/nested-a.txt': '',
  })
  const snapshot = await buildLocalSnapshot(rootPath, NO_EXCLUSIONS)

  assert.ok(path.posix.isAbsolute(snapshot.root))
  assert.ok(Array.isArray(snapshot.files))
  assert.ok(filePaths(snapshot).includes('folder-a/a.txt'))
  assert.ok(filePaths(snapshot).includes('deeper-nested/nested-a.txt'))
  assert.equal('dirEntries' in snapshot, false)
  assert.equal('fileEntries' in snapshot, false)
  assert.doesNotThrow(() => JSON.stringify(snapshot))
})

test('buildLocalSnapshot omits empty directories', async (t) => {
  const rootPath = await createTemporaryDirectory(t, 'local-empty-')
  const snapshot = await buildLocalSnapshot(rootPath, NO_EXCLUSIONS)

  assert.deepEqual(snapshot.files, [])
})

test('buildLocalSnapshot preserves ignored-directory pruning', async (t) => {
  const temporaryPath = await createTemporaryDirectory(t, 'local-pruning-')
  const ignoredRoot = path.join(temporaryPath, 'ignored')
  const noIgnoreRoot = path.join(temporaryPath, 'not-ignored')
  await writeFixtureFiles(ignoredRoot, {
    '.gitignore': 'node_modules\n',
    'node_modules/module-a/index.txt': '',
    'visible.txt': '',
  })
  await writeFixtureFiles(noIgnoreRoot, {
    'node_modules/index.txt': '',
  })

  let snapshot = await buildLocalSnapshot(ignoredRoot, NO_EXCLUSIONS)

  assert.equal(filePaths(snapshot).some(filePath => filePath.startsWith('node_modules/')), false)

  snapshot = await buildLocalSnapshot(noIgnoreRoot, NO_EXCLUSIONS)

  assert.ok(filePaths(snapshot).includes('node_modules/index.txt'))
})

test('buildLocalSnapshot applies nested ignore and negation patterns', async (t) => {
  const nestedRoot = await createTemporaryDirectory(t, 'local-nested-ignore-')
  await writeFixtureFiles(nestedRoot, {
    '.gitignore': 'node_modules\nfolder-b\n/a.txt\n',
    'a.txt': '',
    'folder-a/.gitignore': '',
    'folder-a/a.txt': '',
    'folder-b/b.txt': '',
    'deeper-nested/.gitignore': 'folder-a\n',
    'deeper-nested/folder-a/aa.txt': '',
    'deeper-nested/folder-b/bb.txt': '',
    'deeper-nested/nested-a.txt': '',
  })

  let snapshot = await buildLocalSnapshot(nestedRoot, NO_EXCLUSIONS)

  assert.equal(filePaths(snapshot).some(filePath => filePath.startsWith('deeper-nested/folder-a/')), false)
  assert.equal(filePaths(snapshot).some(filePath => filePath.startsWith('deeper-nested/folder-b/')), false)
  assert.ok(filePaths(snapshot).includes('folder-a/a.txt'))

  const negationRoot = await createNegationFixture(t)
  snapshot = await buildLocalSnapshot(negationRoot, NO_EXCLUSIONS)

  assert.equal(filePaths(snapshot).includes('.env.simple'), false)
  assert.ok(filePaths(snapshot).includes('.env.example'))
  assert.equal(filePaths(snapshot).includes('.yarn/yarn-file'), false)
  assert.ok(filePaths(snapshot).includes('.yarn/patches/patch-file'))
})

test('buildLocalSnapshot applies exclusions before .gitignore negation', async (t) => {
  const rootPath = await createNegationFixture(t)
  const snapshot = await buildLocalSnapshot(rootPath, createExclusions(['.env.example']))

  assert.equal(filePaths(snapshot).includes('.env.example'), false)
})

test('buildLocalSnapshot excludes .git files and directories', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-local-filter-git-'))

  try {
    await fs.mkdir(path.join(rootPath, '.git'))
    await fs.writeFile(path.join(rootPath, '.git', 'config'), 'config')
    await fs.writeFile(path.join(rootPath, 'visible.txt'), 'visible')

    const snapshot = await buildLocalSnapshot(rootPath, createExclusions(['.git']))
    assert.deepEqual(filePaths(snapshot), ['visible.txt'])
  }
  finally {
    await fs.rm(rootPath, { recursive: true, force: true })
  }
})

test('buildLocalSnapshot skips symbolic links without following their targets', async (t) => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-local-symlinks-'))

  try {
    await fs.mkdir(path.join(rootPath, 'real-directory'))
    await fs.writeFile(path.join(rootPath, 'real-file.txt'), 'file')
    await fs.writeFile(path.join(rootPath, 'real-directory', 'nested.txt'), 'nested')

    try {
      await fs.symlink('real-file.txt', path.join(rootPath, 'file-link'))
      await fs.symlink('real-directory', path.join(rootPath, 'directory-link'), 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    const snapshot = await buildLocalSnapshot(rootPath, NO_EXCLUSIONS)

    assert.deepEqual(filePaths(snapshot), [
      'real-directory/nested.txt',
      'real-file.txt',
    ])
  }
  finally {
    await fs.rm(rootPath, { recursive: true, force: true })
  }
})

test('buildLocalSnapshot follows a symbolic link used as its sync root', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-root-symlink-'))
  const directoryPath = path.join(temporaryPath, 'directory')
  const linkPath = path.join(temporaryPath, 'directory-link')

  try {
    await fs.mkdir(directoryPath)
    try {
      await fs.symlink(directoryPath, linkPath, 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    await fs.writeFile(path.join(directoryPath, 'file.txt'), 'file')
    const snapshot = await buildLocalSnapshot(linkPath, NO_EXCLUSIONS)
    assert.deepEqual(filePaths(snapshot), ['file.txt'])
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})

test('buildLocalSnapshot stops when its cancellation signal is aborted', async (t) => {
  const rootPath = await createTemporaryDirectory(t, 'local-cancelled-scan-')
  const controller = new AbortController()
  const reason = new Error('cancel local scan')
  controller.abort(reason)

  await assert.rejects(
    () => buildLocalSnapshot(rootPath, NO_EXCLUSIONS, controller.signal),
    error => error === reason,
  )
})
