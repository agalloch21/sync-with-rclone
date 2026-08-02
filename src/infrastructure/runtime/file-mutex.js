import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'

const DEFAULT_RETRY_DELAY_MS = 20
const DEFAULT_ACQUIRE_TIMEOUT_MS = 5000
const INCOMPLETE_MUTEX_STALE_AFTER_MS = 1000

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function isProcessAlive(pid) {
  if (pid === process.pid)
    return true

  try {
    process.kill(pid, 0)
    return true
  }
  catch (error) {
    return error?.code === 'EPERM'
  }
}

async function readMutexFile(mutexPath) {
  try {
    return await fs.readFile(mutexPath, 'utf8')
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return null
    throw error
  }
}

async function unlinkIfUnchanged(mutexPath, expectedContent) {
  const currentContent = await readMutexFile(mutexPath)
  if (currentContent !== expectedContent)
    return false

  try {
    await fs.unlink(mutexPath)
    return true
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return true
    throw error
  }
}

async function removeStaleMutex(mutexPath) {
  try {
    const stat = await fs.stat(mutexPath)
    const content = await readMutexFile(mutexPath)
    if (content == null)
      return true

    let owner = null
    try {
      owner = JSON.parse(content)
    }
    catch {}

    if (Number.isInteger(owner?.pid) && owner.pid > 0) {
      if (isProcessAlive(owner.pid))
        return false
    }
    else if (Date.now() - stat.mtimeMs <= INCOMPLETE_MUTEX_STALE_AFTER_MS) {
      return false
    }

    return await unlinkIfUnchanged(mutexPath, content)
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return true
    return false
  }
}

async function acquireFileMutex(mutexPath, { timeoutMs, retryDelayMs }) {
  const owner = {
    pid: process.pid,
    token: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const content = JSON.stringify(owner)
  const deadline = Date.now() + timeoutMs

  while (true) {
    let handle = null
    try {
      handle = await fs.open(mutexPath, 'wx')
      await handle.writeFile(content, 'utf8')
      await handle.close()
      return content
    }
    catch (error) {
      if (handle) {
        await handle.close().catch(() => {})
        await fs.unlink(mutexPath).catch(() => {})
      }

      if (error?.code !== 'EEXIST')
        throw error
      if (await removeStaleMutex(mutexPath))
        continue

      if (Date.now() >= deadline) {
        const timeoutError = new Error(`Timed out while waiting for file mutex: ${mutexPath}`)
        timeoutError.code = 'FILE_MUTEX_TIMEOUT'
        throw timeoutError
      }

      await delay(retryDelayMs)
    }
  }
}

/**
 * Serializes a cross-process critical section with an atomically created file.
 * Owner PID metadata permits stale-lock recovery after an owning process exits;
 * the unique token prevents a previous owner from releasing a newer lock.
 */
export async function withFileMutex(
  mutexPath,
  callback,
  {
    timeoutMs = DEFAULT_ACQUIRE_TIMEOUT_MS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  } = {},
) {
  if (!mutexPath || typeof mutexPath !== 'string')
    throw new TypeError('File mutex requires a path.')
  if (typeof callback !== 'function')
    throw new TypeError('File mutex requires a callback.')

  let ownerContent
  try {
    ownerContent = await acquireFileMutex(mutexPath, { timeoutMs, retryDelayMs })
  }
  catch (error) {
    if (error?.code === 'FILE_MUTEX_TIMEOUT')
      throw error

    const mutexError = new Error(`Failed to acquire file mutex: ${mutexPath}`, { cause: error })
    mutexError.code = 'FILE_MUTEX_FAILED'
    throw mutexError
  }

  let result
  let callbackFailed = false
  let callbackError = null
  try {
    result = await callback()
  }
  catch (error) {
    callbackFailed = true
    callbackError = error
  }

  try {
    await unlinkIfUnchanged(mutexPath, ownerContent)
  }
  catch (error) {
    console.warn(`Failed to release file mutex ${mutexPath}: ${error?.message || String(error)}`)
  }

  if (callbackFailed)
    throw callbackError

  return result
}
