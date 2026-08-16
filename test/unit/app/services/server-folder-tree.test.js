import assert from 'node:assert/strict'
import test from 'node:test'
import { buildServerFolderTree } from '#src/app/services/server-folder-tree.js'

test('buildServerFolderTree converts recursive rclone directories into sorted TreeNode nodes', () => {
  const tree = buildServerFolderTree('synology', [
    { Path: 'Projects/Zeta', Name: 'Zeta', IsDir: true },
    { Path: 'Projects', Name: 'Projects', IsDir: true },
    { Path: 'Archive', Name: 'Archive', IsDir: true },
    { Path: 'Projects/Alpha', Name: 'Alpha', IsDir: true },
    { Path: 'ignored.txt', Name: 'ignored.txt', IsDir: false },
  ])

  assert.deepEqual(tree, {
    type: 'directory',
    name: 'synology',
    path: '',
    children: [
      { type: 'directory', name: 'Archive', path: 'Archive', children: null },
      {
        type: 'directory',
        name: 'Projects',
        path: 'Projects',
        children: [
          { type: 'directory', name: 'Alpha', path: 'Projects/Alpha', children: null },
          { type: 'directory', name: 'Zeta', path: 'Projects/Zeta', children: null },
        ],
      },
    ],
  })
})

test('buildServerFolderTree returns a selectable empty root for an empty server', () => {
  assert.deepEqual(buildServerFolderTree('empty', []), {
    type: 'directory',
    name: 'empty',
    path: '',
    children: [],
  })
})

test('buildServerFolderTree creates missing ancestors and normalizes separators', () => {
  const tree = buildServerFolderTree('synology', [
    { Path: '/Projects\\Current/', IsDir: true },
  ])

  assert.equal(tree.children[0].path, 'Projects')
  assert.equal(tree.children[0].children[0].path, 'Projects/Current')
})

test('buildServerFolderTree prefixes children with the requested folder path', () => {
  const tree = buildServerFolderTree('synology', [
    { Path: 'Alpha', IsDir: true },
    { Path: 'Zeta', IsDir: true },
  ], 'Projects')

  assert.deepEqual(tree, {
    type: 'directory',
    name: 'Projects',
    path: 'Projects',
    children: [
      { type: 'directory', name: 'Alpha', path: 'Projects/Alpha', children: null },
      { type: 'directory', name: 'Zeta', path: 'Projects/Zeta', children: null },
    ],
  })
})
