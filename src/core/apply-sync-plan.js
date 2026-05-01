import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { buildRcloneArgs, getRcloneExecutable } from './rclone-runtime.js'

const execFileAsync = promisify(execFile)

function isRemotePath(inputPath) {
  return typeof inputPath === 'string' && inputPath.includes(':') && !inputPath.startsWith('/')
}

function joinPath(rootPath, relativePath) {
  if (!relativePath || relativePath === '.')
    return rootPath

  return isRemotePath(rootPath)
    ? `${rootPath}/${relativePath}`
    : path.posix.join(rootPath, relativePath)
}

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

async function defaultRunCommand(command, args) {
  await execFileAsync(command, args)
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
    configPath: runtimePaths.rcloneConfigPath || '',
  }
}

function createRcloneArgs(runtimePaths, commandArgs) {
  const rcloneRuntime = requireRcloneRuntime(runtimePaths)

  return {
    executable: rcloneRuntime.executable,
    args: buildRcloneArgs(runtimePaths, commandArgs),
  }
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

  const mkdirPaths = []
  const copyPaths = []
  const deletePaths = []
  const rmdirPaths = []

  for (const operation of syncPlan.operations || []) {
    if (operation.type === 'mkdir')
      mkdirPaths.push(operation.path)
    else if (operation.type === 'copy')
      copyPaths.push(operation.path)
    else if (operation.type === 'delete')
      deletePaths.push(operation.path)
    else if (operation.type === 'rmdir')
      rmdirPaths.push(operation.path)
  }

  const phases = []

  if (mkdirPaths.length > 0) {
    phases.push({
      type: 'mkdir',
      description: 'creating directories',
      strategy: executionRoots.destinationKind === 'remote' ? 'per-path-rclone' : 'per-path-fs',
      targetKind: executionRoots.destinationKind,
      root: executionRoots.destinationRoot,
      paths: mkdirPaths,
    })
  }

  if (copyPaths.length > 0) {
    phases.push({
      type: 'copy',
      description: 'copying files',
      strategy: executionRoots.sourceKind === 'remote' || executionRoots.destinationKind === 'remote'
        ? 'batch-rclone-files-from'
        : 'per-path-fs',
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
      strategy: executionRoots.destinationKind === 'remote' ? 'batch-rclone-files-from' : 'per-path-fs',
      targetKind: executionRoots.destinationKind,
      root: executionRoots.destinationRoot,
      paths: deletePaths,
    })
  }

  if (rmdirPaths.length > 0) {
    phases.push({
      type: 'rmdir',
      description: 'deleting directories',
      strategy: executionRoots.destinationKind === 'remote' ? 'per-path-rclone' : 'per-path-fs',
      targetKind: executionRoots.destinationKind,
      root: executionRoots.destinationRoot,
      paths: rmdirPaths,
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

async function applyMkdirPhase(phase, runtimePaths, runCommand) {
  if (phase.targetKind === 'local') {
    for (const relativePath of phase.paths)
      await fs.mkdir(joinPath(phase.root, relativePath), { recursive: true })

    return
  }

  for (const relativePath of phase.paths) {
    const { executable, args } = createRcloneArgs(runtimePaths, [
      'mkdir',
      joinPath(phase.root, relativePath),
    ])
    await runCommand(executable, args)
  }
}

async function applyCopyPhase(phase, runtimePaths, hooks) {
  if (phase.strategy === 'per-path-fs') {
    for (const relativePath of phase.paths) {
      const sourcePath = joinPath(phase.sourceRoot, relativePath)
      const destinationPath = joinPath(phase.destinationRoot, relativePath)
      const sourceStat = await fs.stat(sourcePath)
      await fs.mkdir(path.posix.dirname(destinationPath), { recursive: true })
      await fs.copyFile(sourcePath, destinationPath)
      await fs.utimes(destinationPath, sourceStat.atime, sourceStat.mtime)
    }
    return
  }

  const batchFilePath = await hooks.createBatchFile(phase.paths)
  try {
    const { executable, args } = createRcloneArgs(runtimePaths, [
      'copy',
      phase.sourceRoot,
      phase.destinationRoot,
      '--metadata',
      '--refresh-times',
      '--files-from',
      batchFilePath,
    ])
    await hooks.runCommand(executable, args)
  }
  finally {
    await hooks.removeBatchFile(batchFilePath)
  }
}

async function applyDeletePhase(phase, runtimePaths, hooks) {
  if (phase.targetKind === 'local') {
    for (const relativePath of phase.paths)
      await fs.rm(joinPath(phase.root, relativePath), { force: true })

    return
  }

  const batchFilePath = await hooks.createBatchFile(phase.paths)
  try {
    const { executable, args } = createRcloneArgs(runtimePaths, [
      'delete',
      phase.root,
      '--files-from',
      batchFilePath,
    ])
    await hooks.runCommand(executable, args)
  }
  finally {
    await hooks.removeBatchFile(batchFilePath)
  }
}

async function applyRmdirPhase(phase, runtimePaths, runCommand) {
  if (phase.targetKind === 'local') {
    for (const relativePath of phase.paths)
      await fs.rmdir(joinPath(phase.root, relativePath))

    return
  }

  for (const relativePath of phase.paths) {
    const { executable, args } = createRcloneArgs(runtimePaths, [
      'rmdir',
      joinPath(phase.root, relativePath),
    ])
    await runCommand(executable, args)
  }
}

export async function applySyncPlan(syncPlan, context, runtime, cancelSignal) {
  const execution = buildApplyExecution(syncPlan, context)

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

  runtime?.events?.progress?.(0, execution.phases.length + 1, 'start')

  for (const [index, phase] of execution.phases.entries()) {
    runtime.events.progress?.(index + 1, execution.phases.length + 1, phase.type)

    // await new Promise(resolve => setTimeout(resolve, 5000))

    if (phase.type === 'mkdir')
      await applyMkdirPhase(phase, context.runtimePaths, executionHooks.runCommand)
    else if (phase.type === 'copy')
      await applyCopyPhase(phase, context.runtimePaths, executionHooks)
    else if (phase.type === 'delete')
      await applyDeletePhase(phase, context.runtimePaths, executionHooks)
    else if (phase.type === 'rmdir')
      await applyRmdirPhase(phase, context.runtimePaths, executionHooks.runCommand)

    cancelSignal?.throwIfAborted()
  }

  runtime?.events?.progress?.(execution.phases.length + 1, execution.phases.length + 1, 'complete')

  return {
    action: 'confirm',
    phases: execution.phases,
  }
}
