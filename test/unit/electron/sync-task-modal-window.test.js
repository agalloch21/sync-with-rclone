import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { resetAppStateForTest, setAppModelLoaderForTest, setMainWindow } from '#src/electron/main/app-state.js'
import { destroyMessageBox } from '#src/electron/main/message-box/window.js'
import { createSyncTaskModalHandlers } from '#src/electron/main/sync-task-modal/window.js'

function getFakeRcloneFileName() {
  if (process.platform === 'darwin' && process.arch === 'arm64')
    return 'rclone-osx-arm64'
  if (process.platform === 'darwin' && process.arch === 'x64')
    return 'rclone-osx-amd64'
  if (process.platform === 'win32' && process.arch === 'x64')
    return 'rclone-windows-amd64.exe'
  if (process.platform === 'linux' && process.arch === 'x64')
    return 'rclone-linux-amd64'

  return 'rclone'
}

afterEach(() => {
  destroyMessageBox()
  resetAppStateForTest()
})

async function withFakeRuntimePaths(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-modal-runtime-'))
  const resourcesPath = path.join(tempDir, 'resources')
  const binariesPath = path.join(resourcesPath, 'binaries')
  const rclonePath = path.join(binariesPath, getFakeRcloneFileName())
  const logPath = path.join(tempDir, 'calls.jsonl')
  const original = {
    APP_ROOT_PATH: process.env.APP_ROOT_PATH,
    CONFIG_DIRECTORY: process.env.CONFIG_DIRECTORY,
    CONFIG_PATH: process.env.CONFIG_PATH,
    RCLONE_CONFIG_PATH: process.env.RCLONE_CONFIG_PATH,
    resourcesPath: process.resourcesPath,
  }

  await fs.mkdir(binariesPath, { recursive: true })
  await fs.writeFile(rclonePath, `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(process.argv.slice(2)) + '\\n')
process.exit(0)
`, 'utf8')
  await fs.chmod(rclonePath, 0o755)

  process.env.APP_ROOT_PATH = tempDir
  process.env.CONFIG_DIRECTORY = path.join(tempDir, 'config')
  process.env.RCLONE_CONFIG_PATH = path.join(tempDir, 'config', 'rclone.conf')
  delete process.env.CONFIG_PATH
  Object.defineProperty(process, 'resourcesPath', {
    value: resourcesPath,
    configurable: true,
  })

  try {
    const result = await callback({
      async readCalls() {
        const content = await fs.readFile(logPath, 'utf8')
        return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
      },
    })
    return result
  }
  finally {
    for (const [key, value] of Object.entries(original)) {
      if (key === 'resourcesPath') {
        Object.defineProperty(process, 'resourcesPath', {
          value,
          configurable: true,
        })
      }
      else if (value === undefined) {
        delete process.env[key]
      }
      else {
        process.env[key] = value
      }
    }
  }
}

test('sync task modal listServers handler returns app model servers', async () => {
  setAppModelLoaderForTest(async () => ({
    servers: [
      { name: 'synology', type: 'sftp', address: 'nas.local', status: 'unknown' },
    ],
  }))
  const handlers = createSyncTaskModalHandlers()

  assert.deepEqual(await handlers.listServers(), {
    success: true,
    servers: [
      { name: 'synology', type: 'sftp', address: 'nas.local', status: 'unknown' },
    ],
  })
})

test('createRemote handler saves a flat remote and refreshes app model', async () => {
  await withFakeRuntimePaths(async (fakeRuntime) => {
    let refreshCount = 0
    setMainWindow({ isDestroyed: () => false, webContents: { send() {} } })
    setAppModelLoaderForTest(async () => {
      refreshCount += 1
      return { syncTasks: [] }
    })
    const handlers = createSyncTaskModalHandlers()

    const result = await handlers.createRemote(null, {
      name: 'synology',
      type: 'sftp',
      host: ' nas.local ',
      port: '22',
      user: 'xiaobo',
      pass: 'secret',
    })

    assert.equal(result.success, true)
    assert.deepEqual(result.remote, {
      name: 'synology',
      type: 'sftp',
      host: 'nas.local',
      port: 22,
      user: 'xiaobo',
      pass: 'secret',
    })
    const calls = await fakeRuntime.readCalls()
    assert.deepEqual(calls[0].slice(2), ['config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
    assert.deepEqual(calls[1].slice(2), ['lsf', '--max-depth', '1', 'synology:'])
    assert.deepEqual(calls[2].slice(2), ['config', 'create', 'synology', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
    assert.equal(refreshCount >= 1, true)
  })
})

test('updateRemote handler saves a flat remote and refreshes app model', async () => {
  await withFakeRuntimePaths(async (fakeRuntime) => {
    let refreshCount = 0
    setMainWindow({ isDestroyed: () => false, webContents: { send() {} } })
    setAppModelLoaderForTest(async () => {
      refreshCount += 1
      return { syncTasks: [] }
    })
    const handlers = createSyncTaskModalHandlers()

    const result = await handlers.updateRemote(null, {
      name: 'synology',
      type: 'sftp',
      host: 'nas.local',
      port: '22',
      user: 'xiaobo',
      pass: 'secret',
    })

    assert.equal(result.success, true)
    const calls = await fakeRuntime.readCalls()
    assert.deepEqual(calls[2].slice(2), ['config', 'update', 'synology', 'type', 'sftp', 'host', 'nas.local', 'port', '22', 'user', 'xiaobo', 'pass', 'secret', '--obscure'])
    assert.equal(refreshCount >= 1, true)
  })
})
