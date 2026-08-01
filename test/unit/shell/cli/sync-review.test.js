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

test('CLI sync review rejects a non-interactive terminal unless --yes is explicit', async (t) => {
  t.mock.method(process.stdout, 'write', () => true)
  const inputIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
  const outputIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')
  Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
  Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
  t.after(() => {
    if (inputIsTTY)
      Object.defineProperty(process.stdin, 'isTTY', inputIsTTY)
    else
      delete process.stdin.isTTY

    if (outputIsTTY)
      Object.defineProperty(process.stdout, 'isTTY', outputIsTTY)
    else
      delete process.stdout.isTTY
  })

  const diffSnapshot = createEmptyDiffSnapshot('/local', 'remote:path')
  addFileToDiffSnapshot(diffSnapshot, 'folder/file.txt', DiffState.deleted, 10, 1000)

  await assert.rejects(
    () => reviewDiffInCli(diffSnapshot),
    /Non-interactive sync requires --yes/,
  )
})
