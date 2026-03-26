import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { buildSnapshot } from '#src/modules/scan/build-snapshot.js'

const testBasePath = 'test/fixtures/scan'

test('buildSnapshot throws an error when the path does not exist', () => {
  assert.rejects(async () => {
    await buildSnapshot(path.posix.resolve(testBasePath, 'dir-does-not-exist'))
  })
})

test('buildSnapshot returns an empty snapshot for an empty directory', async () => {
  const fixtureDir = path.posix.resolve(testBasePath, 'empty')

  const snapshot = await buildSnapshot(fixtureDir)

  // root 是扫描根目录
  assert.equal(snapshot.root, fixtureDir)
  // 根目录自己不进入 entries
  assert.ok(snapshot.entriesByPath.has('.') === false)
  // 空目录情况下, entriesByPath为空
  assert.equal(snapshot.entriesByPath.size, 0)
  // 空目录情况下, childrenByPath里至少有一个根目录的值
  assert.deepEqual(snapshot.childrenByPath.get('.'), [])
})

test('nested files and directories', async () => {
  const fixtureDir = path.posix.resolve(testBasePath, 'nested')

  const snapshot = await buildSnapshot(fixtureDir)

  // entriesByPath 里同时有文件和目录
  assert.ok(snapshot.entriesByPath.has('top.txt') && snapshot.entriesByPath.has('docs'))
  // entriesByPath 里文件和目录的type是正确的
  assert.ok(snapshot.entriesByPath.get('top.txt').type === 'file')
  assert.ok(snapshot.entriesByPath.get('docs').type === 'dir')
  // 文件有 size 和mtimeMs
  assert.ok(!!(snapshot.entriesByPath.get('top.txt')))
  assert.ok(snapshot.entriesByPath.get('top.txt')?.mtimeMs !== undefined && snapshot.entriesByPath.get('top.txt')?.size !== undefined)
  // entriesByPath的key是相对根目录的路径
  assert.ok(snapshot.entriesByPath.get('docs/note.txt') !== undefined)
  assert.ok(snapshot.entriesByPath.get('docs/chap1') !== undefined)
  // childrenByPath的key是相对根目录的路径
  assert.ok(snapshot.childrenByPath.get('docs/chap1') !== undefined)
  // childrenByPath的value里存的是相对根目录的路径数组
  assert.ok(snapshot.childrenByPath.get('docs/chap1').includes('article1.txt'))
  // entry.path 使用的路径格式暂不确定
})

test('use POSIX seperator', async () => {
  const snapshot = await buildSnapshot(path.posix.resolve(testBasePath))
  assert.equal(snapshot.root.includes('\\'), false)
  assert.equal(Array.from(snapshot.entriesByPath.keys()).filter(k => k.includes('\\')).length, 0)
  assert.equal(Array.from(snapshot.childrenByPath.keys()).filter(k => k.includes('\\')).length, 0)
})
