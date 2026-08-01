import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { withFileMutex } from '#src/infrastructure/runtime/file-mutex.js'

test('withFileMutex serializes concurrent critical sections', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'file-mutex-'))
  const mutexPath = path.join(directory, 'shared.lock')
  let activeSections = 0
  let maximumActiveSections = 0

  try {
    const enterSection = () => withFileMutex(mutexPath, async () => {
      activeSections += 1
      maximumActiveSections = Math.max(maximumActiveSections, activeSections)
      await new Promise(resolve => setTimeout(resolve, 20))
      activeSections -= 1
    })

    await Promise.all([enterSection(), enterSection(), enterSection()])

    assert.equal(maximumActiveSections, 1)
    await assert.rejects(() => fs.access(mutexPath), error => error?.code === 'ENOENT')
  }
  finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test('withFileMutex removes a stale lock owned by a terminated process', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'stale-file-mutex-'))
  const mutexPath = path.join(directory, 'shared.lock')

  try {
    await fs.writeFile(mutexPath, JSON.stringify({
      pid: 2147483647,
      token: 'abandoned',
      createdAt: new Date(0).toISOString(),
    }))

    let entered = false
    await withFileMutex(mutexPath, async () => {
      entered = true
    })

    assert.equal(entered, true)
    await assert.rejects(() => fs.access(mutexPath), error => error?.code === 'ENOENT')
  }
  finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})
