import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { findLocalSymbolicLinkConflicts } from '#src/infrastructure/filesystem/local-symbolic-links.js'

test('local symbolic-link boundaries report every affected path', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'local-path-boundary-'))
  const externalPath = path.join(temporaryPath, 'external')
  const localRoot = path.join(temporaryPath, 'local')

  try {
    await fs.mkdir(externalPath)
    await fs.mkdir(localRoot)
    try {
      await fs.symlink(externalPath, path.join(localRoot, 'assets'), 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    const conflicts = await findLocalSymbolicLinkConflicts(
      localRoot,
      ['assets/remote.txt', 'assets/nested/other.txt', 'safe/new.txt'],
    )

    assert.deepEqual([...conflicts], [
      ['assets/remote.txt', { symbolicLinkPath: 'assets' }],
      ['assets/nested/other.txt', { symbolicLinkPath: 'assets' }],
    ])
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})
