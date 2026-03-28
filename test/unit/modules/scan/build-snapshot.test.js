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
  // 空目录情况下, fileEntries为空
  assert.equal(snapshot.fileEntries.size, 0)
  // 空目录情况下, dirEntries里至少有一个根目录的值
  assert.deepEqual(snapshot.dirEntries.get('.').children.size, 0)
})

test('nested files and directories', async () => {
  const fixtureDir = path.posix.resolve(testBasePath, 'nested')

  const snapshot = await buildSnapshot(fixtureDir)

  // fileEntries 只有文件, dirEntries 只有目录
  assert.ok(snapshot.fileEntries.has('top.txt') && snapshot.fileEntries.has('docs') === false)
  assert.ok(snapshot.dirEntries.has('top.txt') === false && snapshot.dirEntries.has('docs'))
  // children 里文件和目录的type是正确的
  assert.ok(snapshot.dirEntries.get('.').children.get('top.txt').type === 'file')
  assert.ok(snapshot.dirEntries.get('.').children.get('docs').type === 'dir')

  // 文件有 size 和mtimeMs
  assert.ok(!!(snapshot.fileEntries.get('top.txt')))
  assert.ok(snapshot.fileEntries.get('top.txt')?.mtimeMs !== undefined && snapshot.fileEntries.get('top.txt')?.size !== undefined)
  // fileEntries的key是相对根目录的路径
  assert.ok(snapshot.fileEntries.get('docs/note.txt') !== undefined)
  // dirEntries的key是相对根目录的路径
  assert.ok(snapshot.dirEntries.get('docs/chap1') !== undefined)
  // dirEntries的value里存的是相对根目录的路径数组
  assert.ok(snapshot.dirEntries.get('docs/chap1').children.has('article1.txt') === true)
})

test('use POSIX seperator', async () => {
  const snapshot = await buildSnapshot(path.posix.resolve(testBasePath))
  assert.equal(snapshot.root.includes('\\'), false)
  assert.equal(Array.from(snapshot.fileEntries.keys()).filter(k => k.includes('\\')).length, 0)
  assert.equal(Array.from(snapshot.dirEntries.keys()).filter(k => k.includes('\\')).length, 0)
})
