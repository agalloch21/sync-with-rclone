import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'

import { withFileMutex } from './file-mutex.js'
import { getRuntimePaths } from './runtime-paths.js'

const LOG_FILE_NAME = 'diagnostics.log'
const MAX_LOG_BYTES = 1024 * 1024
const MAX_OUTPUT_BYTES = 64 * 1024
const OUTPUT_HEAD_BYTES = 8 * 1024
const OUTPUT_TRUNCATION_MARKER = '\n…[output truncated]…\n'
const MAX_ERROR_DEPTH = 10
const MAX_VALUE_DEPTH = 6
const MAX_ARRAY_ITEMS = 100
const MAX_STRING_LENGTH = 128 * 1024
const MUTEX_TIMEOUT_MS = 1000
const BLOCK_SEPARATOR = '='.repeat(80)
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

function serializeErrorChain(error) {
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
      chain.push({ name: typeof current, message: truncateString(current) })
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

  return chain
}

function indent(value, spaces = 4) {
  const padding = ' '.repeat(spaces)
  return String(value).split('\n').map(line => `${padding}${line}`).join('\n')
}

function formatObject(value) {
  return JSON.stringify(sanitizeValue(value), null, 2)
}

function formatOutput(label, output) {
  if (!output)
    return []

  const status = output.truncated
    ? `${output.originalBytes} bytes, truncated to ${MAX_OUTPUT_BYTES} bytes`
    : `${output.originalBytes} bytes`
  return [
    `    ${label} (${status}):`,
    indent(output.content, 8),
  ]
}

function formatError(error, index) {
  const heading = error.code === undefined
    ? `  [${index}] ${error.name}`
    : `  [${index}] ${error.name} (${error.code})`
  return [
    heading,
    `    message: ${error.message}`,
    ...(error.detail !== undefined ? [`    detail: ${formatObject(error.detail)}`] : []),
    ...(error.meta !== undefined ? ['    meta:', indent(formatObject(error.meta), 8)] : []),
    ...(error.stack ? ['    stack:', indent(error.stack, 8)] : []),
    ...formatOutput('stdout', error.stdout),
    ...formatOutput('stderr', error.stderr),
  ]
}

function formatDiagnostic(entry) {
  const occurredAt = new Date().toISOString()
  const level = String(entry.level || 'error').toUpperCase()
  const source = truncateString(entry.source || 'application')
  const lines = [
    BLOCK_SEPARATOR,
    `[${occurredAt}] ${level} ${source}`,
    `platform: ${process.platform}/${process.arch}`,
  ]

  if (entry.context !== undefined)
    lines.push('context:', indent(formatObject(entry.context)))

  if (entry.message)
    lines.push(`message: ${truncateString(entry.message)}`)

  if (entry.error) {
    lines.push('error chain:')
    for (const [index, error] of serializeErrorChain(entry.error).entries())
      lines.push(...formatError(error, index))
  }

  lines.push(BLOCK_SEPARATOR, '')
  return `${lines.join('\n')}\n`
}

async function appendDiagnostic(runtimePaths, block) {
  const logDirectory = runtimePaths.logDirectory
  const logPath = path.join(logDirectory, LOG_FILE_NAME)
  const mutexPath = path.join(logDirectory, '.diagnostics-log.lock')
  const blockBytes = Buffer.byteLength(block, 'utf8')

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

    if (currentBytes > 0 && currentBytes + blockBytes > MAX_LOG_BYTES) {
      await fs.writeFile(logPath, block, 'utf8')
      return
    }

    await fs.appendFile(logPath, block, 'utf8')
  }, { timeoutMs: MUTEX_TIMEOUT_MS })
}

export function writeDiagnostic(entry, runtimePaths = getRuntimePaths()) {
  const write = async () => {
    try {
      await appendDiagnostic(runtimePaths, formatDiagnostic(entry))
    }
    catch (error) {
      console.warn(`Failed to write diagnostics log: ${error?.message || String(error)}`)
    }
  }

  processWriteQueue = processWriteQueue.then(write, write)
  return processWriteQueue
}
