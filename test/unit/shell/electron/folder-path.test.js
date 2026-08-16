import assert from 'node:assert/strict'
import test from 'node:test'
import { getFolderPathFoldingCandidates } from '#frontend/surfaces/shared/FolderPath.folding.js'

test('middle folding discards lower-priority middle segments first', () => {
  assert.deepEqual(
    getFolderPathFoldingCandidates('/root/early/late/current', 'middle').slice(0, 6),
    [
      '/root/early/late/current',
      '/root/.../late/current',
      '/root/.../current',
      '.../current',
      'current',
      'curren...',
    ],
  )
})

test('leading folding discards path segments from the root side', () => {
  assert.deepEqual(
    getFolderPathFoldingCandidates('/root/early/late/current').slice(0, 5),
    [
      '/root/early/late/current',
      '.../early/late/current',
      '.../late/current',
      '.../current',
      'current',
    ],
  )
})

test('folded path candidates preserve Windows separators', () => {
  assert.deepEqual(
    getFolderPathFoldingCandidates('C:\\root\\middle\\current', 'middle').slice(0, 5),
    [
      'C:\\root\\middle\\current',
      'C:\\...\\middle\\current',
      'C:\\...\\current',
      '...\\current',
      'current',
    ],
  )
})

test('folded path candidates preserve the remote root and favor the current folder', () => {
  assert.deepEqual(
    getFolderPathFoldingCandidates('synology:Projects/early/current', 'middle').slice(0, 4),
    [
      'synology:Projects/early/current',
      'synology:Projects/.../current',
      '.../current',
      'current',
    ],
  )
})

test('a two-segment path does not invent a hidden middle segment', () => {
  assert.deepEqual(
    getFolderPathFoldingCandidates('/root/current', 'middle').slice(0, 3),
    ['/root/current', '.../current', 'current'],
  )
})

test('a single long trailing segment is shortened with a trailing ellipsis', () => {
  assert.deepEqual(
    getFolderPathFoldingCandidates('current').slice(0, 4),
    ['current', 'curren...', 'curre...', 'curr...'],
  )
  assert.equal(getFolderPathFoldingCandidates('current').at(-1), '...')
})
