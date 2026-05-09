import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { buildRcloneArgs, getRcloneExecutable } from './rclone-runtime.js'

const execFileAsync = promisify(execFile)

function createBatchPathsFileContent(paths) {
  return `${paths.join('\n')}\n`
}

async function defaultCreateBatchFile(paths) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-apply-'))
  const filePath = path.join(tempDir, 'paths.txt')
  await fs.writeFile(filePath, createBatchPathsFileContent(paths), 'utf8')
  return filePath
}

async function defaultRemoveBatchFile(filePath) {
  await fs.rm(path.dirname(filePath), { recursive: true, force: true })
}

async function defaultRunCommand(command, args, options = {}) {
  return execFileAsync(command, args, {
    signal: options.cancelSignal || undefined,
    maxBuffer: 1024 * 1024 * 16,
  })
}

function getExecutionRoots(mode, localFolderPath, remoteFolderPath) {
  if (mode === 'push') {
    return {
      sourceRoot: localFolderPath,
      destinationRoot: remoteFolderPath,
      sourceKind: 'local',
      destinationKind: 'remote',
    }
  }

  return {
    sourceRoot: remoteFolderPath,
    destinationRoot: localFolderPath,
    sourceKind: 'remote',
    destinationKind: 'local',
  }
}

function requireRcloneRuntime(runtimePaths) {
  if (!runtimePaths)
    throw new Error('runtimePaths is required for rclone-backed apply operations')

  return {
    executable: getRcloneExecutable(runtimePaths),
  }
}

function createRcloneArgs(runtimePaths, commandArgs) {
  const rcloneRuntime = requireRcloneRuntime(runtimePaths)

  return {
    executable: rcloneRuntime.executable,
    args: buildRcloneArgs(runtimePaths, commandArgs),
  }
}

function parseConfirmedFilesFromOutput(output) {
  const confirmedFiles = new Set()
  const combinedLinePattern = /^[+*=!-] (.+)$/

  for (const line of String(output || '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed)
      continue

    const combinedMatch = trimmed.match(combinedLinePattern)
    if (combinedMatch) {
      confirmedFiles.add(combinedMatch[1])
      continue
    }

    if (trimmed.startsWith('{')) {
      try {
        const event = JSON.parse(trimmed)
        if (event.object)
          confirmedFiles.add(event.object)
      }
      catch {
        // Ignore non-JSON progress fragments.
      }
    }
  }

  return [...confirmedFiles].sort((left, right) => left.localeCompare(right))
}

function getSelectedFilePaths(syncPlan) {
  return (syncPlan?.operations || [])
    .filter(operation => operation.type === 'copy' || operation.type === 'delete')
    .map(operation => operation.path)
}

function uniquePaths(paths) {
  return [...new Set(paths)]
}

function summarizeExecution(plannedFiles, confirmedFiles) {
  const selectedFiles = uniquePaths(plannedFiles)
  const confirmedPathSet = new Set(confirmedFiles)

  return {
    plannedFiles: selectedFiles,
    confirmedFiles: selectedFiles.filter(filePath => confirmedPathSet.has(filePath)),
  }
}

function attachExecutionSummary(error, plannedFiles, confirmedFiles) {
  const target = error && (typeof error === 'object' || typeof error === 'function')
    ? error
    : new Error('Apply cancelled')
  const summary = summarizeExecution(plannedFiles, confirmedFiles)

  target.plannedFiles = summary.plannedFiles
  target.confirmedFiles = summary.confirmedFiles

  if (target !== error)
    target.cause = error

  return target
}

export function buildApplyExecution(syncPlan, context) {
  if (!syncPlan || syncPlan.action !== 'confirm') {
    return {
      action: 'cancel',
      phases: [],
    }
  }

  const executionRoots = getExecutionRoots(
    context.mode,
    context.localFolderPath,
    context.remoteFolderPath,
  )

  const copyPaths = []
  const deletePaths = []

  for (const operation of syncPlan.operations || []) {
    if (operation.type === 'copy')
      copyPaths.push(operation.path)
    else if (operation.type === 'delete')
      deletePaths.push(operation.path)
  }

  const phases = []

  if (copyPaths.length > 0) {
    phases.push({
      type: 'copy',
      description: 'copying files',
      strategy: 'batch-rclone-files-from',
      sourceKind: executionRoots.sourceKind,
      destinationKind: executionRoots.destinationKind,
      sourceRoot: executionRoots.sourceRoot,
      destinationRoot: executionRoots.destinationRoot,
      paths: copyPaths,
    })
  }

  if (deletePaths.length > 0) {
    phases.push({
      type: 'delete',
      description: 'deleting files',
      strategy: 'batch-rclone-files-from',
      targetKind: executionRoots.destinationKind,
      root: executionRoots.destinationRoot,
      paths: deletePaths,
    })
    phases.push({
      type: 'cleanup-empty-dirs',
      description: 'deleting empty directories',
      strategy: 'rclone-rmdirs',
      targetKind: executionRoots.destinationKind,
      root: executionRoots.destinationRoot,
      paths: [],
    })
  }

  return {
    action: 'confirm',
    sourceRoot: executionRoots.sourceRoot,
    destinationRoot: executionRoots.destinationRoot,
    sourceKind: executionRoots.sourceKind,
    destinationKind: executionRoots.destinationKind,
    phases,
  }
}

async function runRcloneBatchPhase(phase, runtimePaths, hooks, cancelSignal) {
  if (phase.type === 'cleanup-empty-dirs') {
    const { executable, args } = createRcloneArgs(runtimePaths, [
      'rmdirs',
      phase.root,
      '--leave-root',
      '--use-json-log',
      '--log-level',
      'INFO',
    ])
    const result = await hooks.runCommand(executable, args, { cancelSignal })
    return parseConfirmedFilesFromOutput(`${result?.stdout || ''}\n${result?.stderr || ''}`)
  }

  const batchFilePath = await hooks.createBatchFile(phase.paths)
  try {
    const commandArgs = phase.type === 'copy'
      ? [
          'copy',
          phase.sourceRoot,
          phase.destinationRoot,
          '--metadata',
          '--refresh-times',
          '--files-from',
          batchFilePath,
          '--use-json-log',
          '--log-level',
          'INFO',
          '--combined',
          '-',
        ]
      : phase.type === 'delete'
        ? [
            'delete',
            phase.root,
            '--files-from',
            batchFilePath,
            '--rmdirs',
            '--use-json-log',
            '--log-level',
            'INFO',
          ]
        : []

    const { executable, args } = createRcloneArgs(runtimePaths, commandArgs)
    try {
      const result = await hooks.runCommand(executable, args, { cancelSignal })
      return parseConfirmedFilesFromOutput(`${result?.stdout || ''}\n${result?.stderr || ''}`)
    }
    catch (error) {
      error.confirmedFiles = parseConfirmedFilesFromOutput(`${error?.stdout || ''}\n${error?.stderr || ''}`)
      throw error
    }
  }
  finally {
    await hooks.removeBatchFile(batchFilePath)
  }
}

export async function applySyncPlan(syncPlan, context, runtime, cancelSignal) {
  const execution = buildApplyExecution(syncPlan, context)
  const plannedFiles = getSelectedFilePaths(syncPlan)

  if (execution.action !== 'confirm') {
    return {
      action: 'cancel',
      phases: [],
    }
  }

  const executionHooks = {
    runCommand: runtime?.dependents?.runCommand || defaultRunCommand,
    createBatchFile: runtime?.dependents?.createBatchFile || defaultCreateBatchFile,
    removeBatchFile: runtime?.dependents?.removeBatchFile || defaultRemoveBatchFile,
  }

  const confirmedFiles = []
  runtime?.events?.progress?.(0, execution.phases.length + 1, 'start')

  try {
    for (const [index, phase] of execution.phases.entries()) {
      cancelSignal?.throwIfAborted()
      runtime?.events?.progress?.(index + 1, execution.phases.length + 1, phase.type)
      confirmedFiles.push(...await runRcloneBatchPhase(phase, context.runtimePaths, executionHooks, cancelSignal))
    }
  }
  catch (error) {
    if (Array.isArray(error?.confirmedFiles))
      confirmedFiles.push(...error.confirmedFiles)

    if (cancelSignal?.aborted) {
      throw attachExecutionSummary(error, plannedFiles, confirmedFiles)
    }

    throw error
  }

  runtime?.events?.progress?.(execution.phases.length + 1, execution.phases.length + 1, 'complete')

  return {
    action: 'confirm',
    phases: execution.phases,
    ...summarizeExecution(plannedFiles, plannedFiles),
  }
}
