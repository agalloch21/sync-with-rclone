import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRemoteFolderTree,
  listRemoteFolders,
  parseRemoteFolderTreeOutput,
} from '#src/infrastructure/rclone/remote-files.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('buildRemoteFolderTree converts recursive rclone directories into sorted TreeNode nodes', () => {
  const tree = buildRemoteFolderTree('synology', [
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

test('buildRemoteFolderTree returns a selectable empty root for an empty server', () => {
  assert.deepEqual(buildRemoteFolderTree('empty', []), {
    type: 'directory',
    name: 'empty',
    path: '',
    children: [],
  })
})

test('buildRemoteFolderTree creates missing ancestors and normalizes separators', () => {
  const tree = buildRemoteFolderTree('synology', [
    { Path: '/Projects\\Current/', IsDir: true },
  ])

  assert.equal(tree.children[0].path, 'Projects')
  assert.equal(tree.children[0].children[0].path, 'Projects/Current')
})

test('buildRemoteFolderTree prefixes children with the requested folder path', () => {
  const tree = buildRemoteFolderTree('synology', [
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

test('parseRemoteFolderTreeOutput rejects malformed and non-array JSON', () => {
  assert.throws(() => parseRemoteFolderTreeOutput('synology', '{broken'), error => error?.code === 'rclone.parse_failed')
  assert.throws(() => parseRemoteFolderTreeOutput('synology', '{}'), error => error?.code === 'rclone.parse_failed')
})

test('listRemoteFolders maps command failures to a stable rclone error', async () => {
  await assert.rejects(
    () => listRemoteFolders('synology', '', { bundledRclonePath: process.execPath }),
    error => error?.code === 'rclone.command_failed',
  )
})

test('listRemoteFolders limits the initial folder listing to one level', async () => {
  await withFakeAppRuntime({}, async ({ readCalls }) => {
    await listRemoteFolders('synology')
    const calls = await readCalls()

    assert.deepEqual(calls[0], [
      '--config',
      process.env.RCLONE_CONFIG_PATH,
      'lsjson',
      '--max-depth',
      '1',
      '--dirs-only',
      '--no-mimetype',
      'synology:',
    ])
  })
})

test('listRemoteFolders lists one level below the requested folder', async () => {
  await withFakeAppRuntime({}, async ({ readCalls }) => {
    await listRemoteFolders('synology', 'Projects/Current')
    const calls = await readCalls()

    assert.equal(calls[0].at(-1), 'synology:Projects/Current')
  })
})
