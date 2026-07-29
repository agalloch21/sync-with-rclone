import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export function getRcloneExecutable(runtimePaths = {}) {
  return runtimePaths.bundledRclonePath || 'rclone'
}

export function buildRcloneArgs(runtimePaths = {}, commandArgs = []) {
  const args = []

  if (runtimePaths.rcloneConfigPath)
    args.push('--config', runtimePaths.rcloneConfigPath)

  args.push(...commandArgs)
  return args
}

export function createRcloneCommand(runtimePaths, commandArgs) {
  return {
    command: getRcloneExecutable(runtimePaths),
    args: buildRcloneArgs(runtimePaths, commandArgs),
  }
}

export async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      signal: options.cancelSignal || undefined,
    })
    let stdout = ''
    let stderr = ''
    let settled = false

    function settle(fn, value) {
      if (settled)
        return

      settled = true
      fn(value)
    }

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      options.onOutput?.(text)
    })
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      options.onOutput?.(text)
    })
    child.on('error', (error) => {
      error.stdout = stdout
      error.stderr = stderr
      settle(reject, error)
    })
    child.on('close', (code) => {
      if (code === 0) {
        settle(resolve, { stdout, stderr })
        return
      }

      const error = new Error(`${command} exited with code ${code}`)
      error.code = code
      error.stdout = stdout
      error.stderr = stderr
      settle(reject, error)
    })
  })
}

export function createBatchPathsFileContent(paths) {
  return `${paths.join('\n')}\n`
}

async function createBatchFile(paths) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-apply-'))
  const filePath = path.join(tempDir, 'paths.txt')
  await fs.writeFile(filePath, createBatchPathsFileContent(paths), 'utf8')
  return filePath
}

async function removeBatchFile(filePath) {
  await fs.rm(path.dirname(filePath), { recursive: true, force: true })
}

export async function withBatchFile(paths, callback) {
  const filePath = await createBatchFile(paths)
  let result
  let callbackFailed = false
  let callbackError = null

  try {
    result = await callback(filePath)
  }
  catch (error) {
    callbackFailed = true
    callbackError = error
  }

  try {
    await removeBatchFile(filePath)
  }
  catch (cleanupError) {
    if (!callbackFailed)
      throw cleanupError
  }

  if (callbackFailed)
    throw callbackError

  return result
}

function isCopySuccessEvent(event) {
  // rclone emits one JSON log record per file when --use-json-log is enabled.
  // For partial apply failures, only a successful per-file copy log proves
  // that this selected file was actually handled by the failed batch.
  return event.level === 'info'
    && typeof event.object === 'string'
    && typeof event.msg === 'string'
    && event.msg.startsWith('Copied')
}

function isDeleteSuccessEvent(event) {
  // Delete batches use the same JSON log stream. Error/notice records can also
  // include object names, so require the success-level Deleted message.
  return event.level === 'info'
    && typeof event.object === 'string'
    && typeof event.msg === 'string'
    && event.msg.startsWith('Deleted')
}

export function parseConfirmedFilesFromOutput(output, operationType) {
  const confirmedFiles = new Set()
  const isSuccessEvent = operationType === 'delete' ? isDeleteSuccessEvent : isCopySuccessEvent

  for (const line of String(output || '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed)
      continue

    if (!trimmed.startsWith('{'))
      continue

    try {
      const event = JSON.parse(trimmed)
      if (isSuccessEvent(event))
        confirmedFiles.add(event.object)
    }
    catch {
      // Ignore non-JSON progress fragments.
    }
  }

  return [...confirmedFiles].sort((left, right) => left.localeCompare(right))
}

function parseSizeToBytes(amount, unit) {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value))
    return null

  const normalizedUnit = unit.toUpperCase()
  const multipliers = {
    B: 1,
    KIB: 1024,
    MIB: 1024 ** 2,
    GIB: 1024 ** 3,
    TIB: 1024 ** 4,
    PIB: 1024 ** 5,
  }

  return Math.round(value * (multipliers[normalizedUnit] || 1))
}

export function parseTransferProgressFromOutput(output) {
  const transferPattern = /Transferred:\s*([0-9.]+)\s*([KMGTPE]?i?B)\s*\/\s*([0-9.]+)\s*([KMGTPE]?i?B)/gi
  let progress = null

  for (const match of String(output || '').matchAll(transferPattern)) {
    const current = parseSizeToBytes(match[1], match[2])
    const total = parseSizeToBytes(match[3], match[4])
    if (current !== null && total !== null && total > 0)
      progress = { current, total }
  }

  return progress
}
