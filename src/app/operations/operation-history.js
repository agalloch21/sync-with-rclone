import crypto from 'node:crypto'
import EventEmitter from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'

import { getErrorCode } from '../app-errors.js'
import { getRuntimePaths } from '../runtime-paths.js'

export const OPERATION_HISTORY_STATUS = Object.freeze({
  STARTED: 'started',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
})

const HISTORY_FILE_NAME = 'operation-history.jsonl'
const DEFAULT_HISTORY_LIMIT = 200
const operationHistoryEventEmitter = new EventEmitter()
let writeQueue = Promise.resolve()

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isTerminalStatus(status) {
  return status === OPERATION_HISTORY_STATUS.SUCCEEDED
    || status === OPERATION_HISTORY_STATUS.FAILED
    || status === OPERATION_HISTORY_STATUS.CANCELLED
}

function getHistoryPath() {
  return path.join(getRuntimePaths().logDirectory, HISTORY_FILE_NAME)
}

function normalizeLimit(limit) {
  if (!Number.isInteger(limit) || limit <= 0)
    return DEFAULT_HISTORY_LIMIT

  return Math.min(limit, 1000)
}

function createErrorSummary(error) {
  if (!error)
    return undefined

  return {
    code: getErrorCode(error),
    message: error?.message || String(error),
  }
}

function isOperationHistoryRecord(record) {
  return isPlainObject(record)
    && record.schemaVersion === 1
    && typeof record.eventId === 'string'
    && typeof record.operationId === 'string'
    && typeof record.occurredAt === 'string'
    && typeof record.operation === 'string'
    && Object.values(OPERATION_HISTORY_STATUS).includes(record.status)
    && (record.subject === undefined || isPlainObject(record.subject))
    && (record.error === undefined || isPlainObject(record.error))
}

function createRecord({
  operationId,
  operation,
  status,
  subject,
  error,
}) {
  return {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    operationId,
    occurredAt: new Date().toISOString(),
    operation,
    status,
    ...(subject && { subject }),
    ...(error && { error: createErrorSummary(error) }),
  }
}

async function appendRecord(record) {
  const historyPath = getHistoryPath()
  const write = async () => {
    await fs.mkdir(path.dirname(historyPath), { recursive: true })
    await fs.appendFile(historyPath, `${JSON.stringify(record)}\n`, 'utf8')
  }

  writeQueue = writeQueue.then(write, write)
  await writeQueue
  operationHistoryEventEmitter.emit('update', record)
}

async function appendRecordWithoutBreakingOperation(record) {
  try {
    await appendRecord(record)
  }
  catch (error) {
    console.warn(`Failed to write operation history: ${error?.message || String(error)}`)
  }
}

function normalizeTerminalResult(definition, result) {
  const resolved = definition.resolveResult?.(result)
  if (!resolved)
    return { status: OPERATION_HISTORY_STATUS.SUCCEEDED }

  if (!isTerminalStatus(resolved.status))
    throw new TypeError(`Invalid terminal operation history status: ${resolved.status}`)

  return resolved
}

export function registerOperationHistoryListener(listener) {
  operationHistoryEventEmitter.on('update', listener)
}

export function unregisterOperationHistoryListener(listener) {
  operationHistoryEventEmitter.off('update', listener)
}

export async function listOperationHistory({ limit = DEFAULT_HISTORY_LIMIT } = {}) {
  try {
    await writeQueue.catch(() => {})
    const content = await fs.readFile(getHistoryPath(), 'utf8')
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        }
        catch {
          return null
        }
      })
      .filter(isOperationHistoryRecord)
      .slice(-normalizeLimit(limit))
      .reverse()
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return []
    throw error
  }
}

export async function runOperationWithHistory(definition, execute) {
  if (!isPlainObject(definition) || typeof definition.operation !== 'string' || definition.operation.trim().length === 0)
    throw new TypeError('Operation history definition requires an operation.')
  if (typeof execute !== 'function')
    throw new TypeError('Operation history requires an execute function.')

  const operationId = crypto.randomUUID()
  const subject = definition.subject

  await appendRecordWithoutBreakingOperation(createRecord({
    operationId,
    operation: definition.operation,
    status: OPERATION_HISTORY_STATUS.STARTED,
    subject,
  }))

  try {
    const result = await execute()
    const terminal = normalizeTerminalResult(definition, result)
    await appendRecordWithoutBreakingOperation(createRecord({
      operationId,
      operation: definition.operation,
      status: terminal.status,
      subject,
      error: terminal.error,
    }))
    return result
  }
  catch (error) {
    await appendRecordWithoutBreakingOperation(createRecord({
      operationId,
      operation: definition.operation,
      status: OPERATION_HISTORY_STATUS.FAILED,
      subject,
      error,
    }))
    throw error
  }
}

export function defineAppOperation(definition, implementation) {
  if (typeof implementation !== 'function')
    throw new TypeError('App operation implementation must be a function.')

  return async function appOperationWithHistory(...args) {
    const subject = definition.getSubject?.(args)
    return await runOperationWithHistory({
      ...definition,
      subject,
    }, () => implementation(...args))
  }
}
