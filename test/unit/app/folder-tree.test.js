import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFolderTree, getRcloneFolderTree, parseFolderTreeOutput } from '#src/app/configuration/rclone-config.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('buildFolderTree converts recursive rclone directories into sorted TreeNode nodes', () => {
  const tree = buildFolderTree('synology', [
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

test('buildFolderTree returns a selectable empty root for an empty server', () => {
  assert.deepEqual(buildFolderTree('empty', []), {
    type: 'directory',
    name: 'empty',
    path: '',
    children: [],
  })
})

test('buildFolderTree creates missing ancestors and normalizes separators', () => {
  const tree = buildFolderTree('synology', [
    { Path: '/Projects\\Current/', IsDir: true },
  ])

  assert.equal(tree.children[0].path, 'Projects')
  assert.equal(tree.children[0].children[0].path, 'Projects/Current')
})

test('buildFolderTree prefixes children with the requested folder path', () => {
  const tree = buildFolderTree('synology', [
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

test('parseFolderTreeOutput rejects malformed and non-array JSON', () => {
  assert.throws(() => parseFolderTreeOutput('synology', '{broken'), error => error?.code === 'rclone.parse_failed')
  assert.throws(() => parseFolderTreeOutput('synology', '{}'), error => error?.code === 'rclone.parse_failed')
})

test('getRcloneFolderTree maps command failures to a stable rclone error', async () => {
  await assert.rejects(
    () => getRcloneFolderTree('synology', '', { bundledRclonePath: process.execPath }),
    error => error?.code === 'rclone.command_failed',
  )
})

test('getRcloneFolderTree limits the initial folder listing to one level', async () => {
  await withFakeAppRuntime({}, async ({ readCalls }) => {
    await getRcloneFolderTree('synology')
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

test('getRcloneFolderTree lists one level below the requested folder', async () => {
  await withFakeAppRuntime({}, async ({ readCalls }) => {
    await getRcloneFolderTree('synology', 'Projects/Current')
    const calls = await readCalls()

    assert.equal(calls[0].at(-1), 'synology:Projects/Current')
  })
})
