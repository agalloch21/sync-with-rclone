import assert from 'node:assert/strict'
import test from 'node:test'
import { reviewDiffInCli } from '#cli/sync-review.js'
import {
  addFileToDiffSnapshot,
  createEmptyDiffSnapshot,
  DiffState,
} from '#src/core/snapshots/snapshot.js'

test('CLI sync review --yes behavior confirms every diff entry without prompting', async (t) => {
  t.mock.method(process.stdout, 'write', () => true)

  const diffSnapshot = createEmptyDiffSnapshot('/local', 'remote:path')
  addFileToDiffSnapshot(diffSnapshot, 'folder/file.txt', DiffState.added, 10, 1000)

  const result = await reviewDiffInCli(diffSnapshot, { bypassConfirmation: true })

  assert.deepEqual(result, {
    action: 'confirm',
    selectedPaths: ['folder', 'folder/file.txt'],
  })
})
