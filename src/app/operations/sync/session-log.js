import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { withFileMutex } from '#src/infrastructure/runtime/file-mutex.js'
import { getRuntimePaths } from '#src/infrastructure/runtime/runtime-paths.js'

const LOG_FILE_NAME = 'sync-session.log'
const LOG_SCHEMA_VERSION = 1
const MAX_LOG_BYTES = 5 * 1024 * 1024
const LOG_BACKUP_COUNT = 3
const MAX_OUTPUT_BYTES = 64 * 1024
const OUTPUT_HEAD_BYTES = 8 * 1024
const OUTPUT_TRUNCATION_MARKER = '\n…[output truncated]…\n'
const MAX_ERROR_DEPTH = 10
const MAX_VALUE_DEPTH = 6
const MAX_ARRAY_ITEMS = 100
const MAX_STRING_LENGTH = 128 * 1024
const MUTEX_TIMEOUT_MS = 1000
const REDACTED = '[REDACTED]'

const urlCredentialsPattern = /((?:https?|sftp|ftp|ssh|webdav):\/\/)[^\s/:@]+:[^\s/@]+@/gi
const quotedSecretPattern = /("(?:pass|passwd|password|passphrase|token|secret|private[_ -]?key|client[_ -]?secret)"\s*:\s*")[^"]*(")/gi
const assignedSecretPattern = /((?:pass|passwd|password|passphrase|token|secret|private[_ -]?key|client[_ -]?secret)\s*[=:]\s*)[^\s,;]+/gi

let processWriteQueue = Promise.resolve()

function redactString(value) {
  return String(value)
    .replace(urlCredentialsPattern, `$1${REDACTED}:${REDACTED}@`)
    .replace(quotedSecretPattern, `$1${REDACTED}$2`)
    .replace(assignedSecretPattern, `$1${REDACTED}`)
}

function truncateString(value, maximumLength = MAX_STRING_LENGTH) {
  const redacted = redactString(value)
  if (redacted.length <= maximumLength)
    return redacted

  return `${redacted.slice(0, maximumLength)}…[truncated]`
}

function isSecretKey(key) {
  const normalized = String(key).replaceAll(/[^a-z\d]/gi, '').toLowerCase()
  return normalized === 'pass'
    || normalized === 'passwd'
    || normalized === 'password'
    || normalized === 'passphrase'
    || normalized === 'privatekey'
    || normalized.endsWith('token')
    || normalized.endsWith('secret')
}

function sanitizeValue(value, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number')
    return value

  if (typeof value === 'bigint')
    return String(value)

  if (typeof value === 'string')
    return truncateString(value)

  if (typeof value === 'function')
    return `[Function${value.name ? ` ${value.name}` : ''}]`

  if (typeof value !== 'object')
    return String(value)

  if (seen.has(value))
    return '[Circular]'

  if (depth >= MAX_VALUE_DEPTH)
    return '[Max depth reached]'

  seen.add(value)
  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map(item => sanitizeValue(item, seen, depth + 1))
    if (value.length > MAX_ARRAY_ITEMS)
      items.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`)
    return items
  }

  const sanitized = {}
  for (const [key, item] of Object.entries(value)) {
    sanitized[key] = isSecretKey(key)
      ? REDACTED
      : sanitizeValue(item, seen, depth + 1)
  }
  return sanitized
}

function serializeOutput(value) {
  if (value === undefined || value === null || value === '')
    return undefined

  const originalBytes = Buffer.byteLength(String(value), 'utf8')
  const content = redactString(value)
  const buffer = Buffer.from(content, 'utf8')
  if (buffer.byteLength <= MAX_OUTPUT_BYTES) {
    return {
      content,
      truncated: false,
      originalBytes,
    }
  }

  const marker = Buffer.from(OUTPUT_TRUNCATION_MARKER, 'utf8')
  const tailBytes = MAX_OUTPUT_BYTES - OUTPUT_HEAD_BYTES - marker.byteLength - 8
  return {
    content: Buffer.concat([
      buffer.subarray(0, OUTPUT_HEAD_BYTES),
      marker,
      buffer.subarray(-tailBytes),
    ]).toString('utf8'),
    truncated: true,
    originalBytes,
  }
}

function serializeError(error) {
  const chain = []
  const seen = new Set()
  let current = error

  while (current !== undefined && current !== null && chain.length < MAX_ERROR_DEPTH) {
    if ((typeof current === 'object' || typeof current === 'function') && seen.has(current)) {
      chain.push({ name: 'CircularCause', message: '[Circular cause]' })
      break
    }

    if (typeof current === 'object' || typeof current === 'function')
      seen.add(current)

    if (typeof current !== 'object' && typeof current !== 'function') {
      chain.push({
        name: typeof current,
        message: truncateString(current),
      })
      break
    }

    const stdout = serializeOutput(current.stdout)
    const stderr = serializeOutput(current.stderr)
    chain.push({
      name: truncateString(current.name || current.constructor?.name || 'Error'),
      ...(current.code !== undefined && { code: sanitizeValue(current.code) }),
      message: truncateString(current.message || String(current)),
      ...(current.detail !== undefined && { detail: sanitizeValue(current.detail) }),
      ...(current.meta !== undefined && { meta: sanitizeValue(current.meta) }),
      ...(current.stack && { stack: truncateString(current.stack, 64 * 1024) }),
      ...(stdout && { stdout }),
      ...(stderr && { stderr }),
    })

    current = current.cause
  }

  if (current !== undefined && current !== null && chain.length >= MAX_ERROR_DEPTH)
    chain.push({ name: 'CauseDepthLimit', message: '[Cause chain truncated]' })

  return { chain }
}

function summarizeContext(context = {}) {
  return {
    mode: typeof context.mode === 'string' ? context.mode : '',
    localFolderPath: typeof context.localFolderPath === 'string' ? context.localFolderPath : '',
    remoteFolderPath: typeof context.remoteFolderPath === 'string' ? context.remoteFolderPath : '',
    ...(context.bypassConfig !== undefined && { bypassConfig: Boolean(context.bypassConfig) }),
    ...(Array.isArray(context.extraIgnorePatterns) && {
      extraIgnorePatternCount: context.extraIgnorePatterns.length,
    }),
  }
}

function summarizeOperations(operations) {
  if (!Array.isArray(operations))
    return undefined

  const pendingOperations = operations.filter(operation => operation?.synced !== true)
  const pendingPaths = pendingOperations
    .map(operation => operation?.path)
    .filter(operationPath => typeof operationPath === 'string')

  return {
    total: operations.length,
    synced: operations.filter(operation => operation?.synced === true).length,
    pending: pendingOperations.length,
    ...(pendingPaths.length > 0 && {
      pendingPaths: pendingPaths.slice(0, MAX_ARRAY_ITEMS),
      pendingPathsTruncated: pendingPaths.length > MAX_ARRAY_ITEMS,
    }),
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return false
    throw error
  }
}

async function rotateLogs(logPath) {
  await fs.rm(`${logPath}.${LOG_BACKUP_COUNT}`, { force: true })

  for (let index = LOG_BACKUP_COUNT - 1; index >= 1; index -= 1) {
    const source = `${logPath}.${index}`
    if (await pathExists(source))
      await fs.rename(source, `${logPath}.${index + 1}`)
  }

  if (await pathExists(logPath))
    await fs.rename(logPath, `${logPath}.1`)
}

async function appendLine(runtimePaths, line) {
  const logDirectory = runtimePaths.logDirectory
  const logPath = path.join(logDirectory, LOG_FILE_NAME)
  const mutexPath = path.join(logDirectory, '.sync-session-log.lock')
  const lineBytes = Buffer.byteLength(line, 'utf8')

  await fs.mkdir(logDirectory, { recursive: true })
  await withFileMutex(mutexPath, async () => {
    let currentBytes = 0
    try {
      currentBytes = (await fs.stat(logPath)).size
    }
    catch (error) {
      if (error?.code !== 'ENOENT')
        throw error
    }

    if (currentBytes > 0 && currentBytes + lineBytes > MAX_LOG_BYTES)
      await rotateLogs(logPath)

    await fs.appendFile(logPath, line, 'utf8')
  }, { timeoutMs: MUTEX_TIMEOUT_MS })
}

function appendRecordWithoutBreakingSession(runtimePaths, record) {
  const write = async () => {
    try {
      await appendLine(runtimePaths, `${JSON.stringify(record)}\n`)
    }
    catch (error) {
      console.warn(`Failed to write sync session log: ${error?.message || String(error)}`)
    }
  }

  processWriteQueue = processWriteQueue.then(write, write)
  return processWriteQueue
}

function createBaseRecord(sessionId, event, level) {
  return {
    schemaVersion: LOG_SCHEMA_VERSION,
    occurredAt: new Date().toISOString(),
    sessionId,
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    level,
    event,
  }
}

export function createSyncSessionLogger(options = {}, runtimePaths = getRuntimePaths()) {
  const sessionId = crypto.randomUUID()
  let lastActivity = null

  function record(buildRecord) {
    try {
      const built = buildRecord()
      if (!built?.event)
        return Promise.resolve()

      const { event, payload = {}, level = 'info' } = built
      const logRecord = {
        ...createBaseRecord(sessionId, event, level),
        ...sanitizeValue(payload),
      }
      return appendRecordWithoutBreakingSession(runtimePaths, logRecord)
    }
    catch (error) {
      console.warn(`Failed to serialize sync session log: ${error?.message || String(error)}`)
      return Promise.resolve()
    }
  }

  return {
    sessionId,

    started() {
      return record(() => ({
        event: 'session.started',
        payload: {
          requestedContext: summarizeContext(options),
          runtime: {
            executablePath: process.execPath,
            configPath: runtimePaths.configPath,
            rcloneConfigPath: runtimePaths.rcloneConfigPath,
            bundledRclonePath: runtimePaths.bundledRclonePath,
          },
        },
      }))
    },

    contextResolved(context) {
      return record(() => ({
        event: 'session.context-resolved',
        payload: { context: summarizeContext(context) },
      }))
    },

    phase(phaseEvent) {
      return record(() => {
        if (phaseEvent?.type === 'sync.phase.progress') {
          const activity = phaseEvent.progress?.activity
          if (!activity || activity === lastActivity)
            return { event: null }

          lastActivity = activity
          return {
            event: 'sync.phase.activity',
            payload: {
              phase: phaseEvent.phase,
              activity,
              index: phaseEvent.progress?.index,
              total: phaseEvent.progress?.total,
            },
          }
        }

        return {
          event: phaseEvent.type,
          payload: {
            phase: phaseEvent.phase,
            message: phaseEvent.message,
          },
          level: phaseEvent?.type === 'sync.phase.failed' ? 'error' : 'info',
        }
      })
    },

    warning(event, error) {
      return record(() => ({
        event,
        payload: { error: serializeError(error) },
        level: 'warning',
      }))
    },

    result(sessionResult) {
      return record(() => {
        const result = sessionResult?.result
        const operations = summarizeOperations(sessionResult?.operations)
        return {
          event: `session.${result || 'unknown'}`,
          payload: {
            result,
            ...(sessionResult?.reason && { reason: sessionResult.reason }),
            ...(sessionResult?.summary && { summary: sessionResult.summary }),
            ...(operations && { operations }),
            ...(result === 'failed' && {
              error: serializeError(sessionResult.error),
            }),
          },
          level: result === 'failed' ? 'error' : 'info',
        }
      })
    },

    unexpected(error) {
      return record(() => ({
        event: 'session.unexpected-error',
        payload: { error: serializeError(error) },
        level: 'error',
      }))
    },
  }
}
