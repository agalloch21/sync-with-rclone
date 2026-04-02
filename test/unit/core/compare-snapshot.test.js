import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { buildLocalSnapshot } from '#src/core/build-local-snapshot.js'
import { buildRemoteSnapshot } from '#src/core/build-remote-snapshot.js'
import { compareSnapshot } from '#src/core/compare-snapshot.js'
import { printDiffSnapshot } from '#src/types/snapshot.js'

const REMOTE_NAME = 'fake-remote'

test('Test compareSnapshot', async () => {
  const localRoot = path.posix.resolve('test/fixtures/local/compare-push')
  const remoteRoot = `${REMOTE_NAME}:` + `compare-push`

  const localSnapshot = await buildLocalSnapshot(localRoot)
  const remoteSnapshot = await buildRemoteSnapshot(remoteRoot)

  // push mode. local as source, remote as destination
  const diffSnapshot = compareSnapshot(localSnapshot, remoteSnapshot)
  printDiffSnapshot(diffSnapshot)
  assert.ok(diffSnapshot.fileEntries.size > 0)
})
