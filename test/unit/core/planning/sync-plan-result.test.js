import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSyncOperations,
  markOperationsSynced,
} from '#src/core/planning/sync-plan-result.js'

test('sync plan result tracks only executable operations and marks confirmed paths', () => {
  const operations = createSyncOperations({
    operations: [
      { type: 'copy', path: 'copied.txt' },
      { type: 'delete', path: 'deleted.txt' },
      { type: 'ignore', path: 'ignored.txt' },
    ],
  })

  markOperationsSynced(operations, ['copied.txt'])

  assert.deepEqual(operations, [
    { type: 'copy', path: 'copied.txt', status: 'synced' },
    { type: 'delete', path: 'deleted.txt', status: 'pending' },
  ])
})
