import * as appOperations from '#src/app/app-operations.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'
import { SERVER_OPERATION } from '#src/app/operations/server-operation-contract.js'
import { SYNC_TASK_OPERATION } from '#src/app/operations/task-operation-contract.js'
import { parseSyncArgs } from '#src/app/sync-session/parse-sync-args.js'
import { startSync } from '#src/app/sync-session/start-sync.js'
import { SYNC_RESULT } from '#src/core/contract.js'
import { createCliOperationReportDisplay } from './operation-report-display.js'
import { reviewDiffInCli } from './review.js'

const COMMANDS = new Set([
  'sync',
  'list-servers',
  'get-server',
  'list-server-folders',
  'test-server',
  'create-server',
  'update-server',
  'delete-server',
  'list-tasks',
  'create-task',
  'update-task',
  'update-task-ignore-patterns',
  'delete-task',
  'list-global-ignore-patterns',
  'update-global-ignore-patterns',
])

function hasJsonFlag(argv) {
  return argv.includes('--json')
}

function stripCliFlags(argv) {
  return argv.filter(arg => arg !== '--json')
}

function requireArguments(args, count, usage) {
  if (args.length < count)
    throw new Error(`Usage: ${usage}`)
}

function parseProtocolFields(entries) {
  return Object.fromEntries(entries.map((entry) => {
    const separatorIndex = entry.indexOf('=')
    if (separatorIndex <= 0)
      throw new Error(`Invalid protocol field "${entry}". Expected name=value.`)

    return [
      entry.slice(0, separatorIndex),
      entry.slice(separatorIndex + 1),
    ]
  }))
}

function createTaskReference(serverName, localFolderPath) {
  return {
    rcloneRemote: serverName,
    localBasePath: localFolderPath,
  }
}

function createTaskMapping(serverName, localFolderPath, remoteFolderPath) {
  return {
    ...createTaskReference(serverName, localFolderPath),
    remoteBasePath: remoteFolderPath,
  }
}

function stringifyTable(rows, columns) {
  if (rows.length === 0)
    return ''

  const widths = columns.map(column => Math.max(
    column.label.length,
    ...rows.map(row => String(row[column.key] ?? '').length),
  ))

  const header = columns.map((column, index) => column.label.padEnd(widths[index])).join('  ')
  const divider = widths.map(width => '-'.repeat(width)).join('  ')
  const body = rows.map(row => columns
    .map((column, index) => String(row[column.key] ?? '').padEnd(widths[index]))
    .join('  '))

  return [header, divider, ...body].join('\n')
}

function printJson(output, payload) {
  output.log(JSON.stringify(payload, null, 2))
}

function printServers(output, servers) {
  output.log(stringifyTable(servers, [
    { key: 'name', label: 'SERVER' },
    { key: 'type', label: 'TYPE' },
    { key: 'address', label: 'ADDRESS' },
  ]))
}

function printTasks(output, syncTasks) {
  output.log(stringifyTable(syncTasks, [
    { key: 'rcloneRemote', label: 'SERVER' },
    { key: 'displayName', label: 'DISPLAY' },
    { key: 'localBasePath', label: 'LOCAL' },
    { key: 'remotePath', label: 'REMOTE' },
    { key: 'lastSync', label: 'LAST_SYNC' },
  ]))
}

function flattenFolderPaths(folder, paths = []) {
  for (const child of folder?.children || []) {
    paths.push(child.path)
    flattenFolderPaths(child, paths)
  }
  return paths
}

function toTaskRows(syncTasks) {
  return syncTasks.map(task => ({
    ...task,
    remotePath: `${task.rcloneRemote}:${task.remoteBasePath}`,
    lastSync: [task.lastSyncMode, task.lastSyncDate, task.lastSyncFolder].filter(Boolean).join(' | ') || '-',
  }))
}

function getOperations(runtime) {
  return runtime?.operations || appOperations
}

async function runReportedOperation(operation, execute, output, runtime) {
  const display = runtime?.operationReportDisplay
    || createCliOperationReportDisplay({ output })
  const reporter = createOperationReporter(operation, display)

  try {
    await execute(reporter.step)
    await reporter.succeed(true)
    return 0
  }
  catch (error) {
    await reporter.error(error)
    return 1
  }
}

async function runSync(argv, output, runtime) {
  const options = parseSyncArgs(argv)
  const runStartSync = runtime?.dependents?.startSync || startSync
  const result = await runStartSync(options, {
    interactions: {
      reviewDiff: reviewDiffInCli,
    },
  })

  if (result.result === SYNC_RESULT.FAILED) {
    output.error(`Error: ${result.message}`)
    if (result.error?.stack && process.env.DEBUG)
      output.error(result.error.stack)
    return 1
  }

  return 0
}

async function runListServers(json, output, operations) {
  const servers = await operations.listServers()

  if (json)
    printJson(output, { servers })
  else
    printServers(output, servers)

  return 0
}

async function runGetServer(args, json, output, operations) {
  requireArguments(args, 1, 'get-server <server>')
  const server = await operations.getServer(args[0])

  if (json)
    printJson(output, { server })
  else
    printServers(output, [server])

  return 0
}

async function runListServerFolders(args, json, output, operations) {
  requireArguments(args, 1, 'list-server-folders <server> [folder]')
  const tree = await operations.getFolderTree(args[0], args[1] || '')

  if (json)
    printJson(output, { tree })
  else
    output.log(flattenFolderPaths(tree).join('\n'))

  return 0
}

async function runTestServer(args, output, operations, runtime) {
  requireArguments(args, 1, 'test-server <server>')
  return await runReportedOperation(
    SERVER_OPERATION.TEST,
    onProgress => operations.testServerConnection(args[0], onProgress),
    output,
    runtime,
  )
}

async function runCreateServer(args, output, operations, runtime) {
  requireArguments(args, 2, 'create-server <server> <protocol> [field=value ...]')
  const [name, protocolType, ...fieldEntries] = args
  const protocolFields = parseProtocolFields(fieldEntries)
  return await runReportedOperation(
    SERVER_OPERATION.CREATE,
    onProgress => operations.createServer(name, protocolType, protocolFields, onProgress),
    output,
    runtime,
  )
}

async function runUpdateServer(args, output, operations, runtime) {
  requireArguments(args, 3, 'update-server <server> <new-server> <protocol> [field=value ...]')
  const [name, expectedName, protocolType, ...fieldEntries] = args
  const protocolFields = parseProtocolFields(fieldEntries)
  return await runReportedOperation(
    SERVER_OPERATION.UPDATE,
    onProgress => operations.updateServer(name, expectedName, protocolType, protocolFields, onProgress),
    output,
    runtime,
  )
}

async function runDeleteServer(args, output, operations, runtime) {
  requireArguments(args, 1, 'delete-server <server>')
  return await runReportedOperation(
    SERVER_OPERATION.DELETE,
    onProgress => operations.deleteServer(args[0], onProgress),
    output,
    runtime,
  )
}

async function runListTasks(json, output, operations) {
  const syncTasks = await operations.listSyncTasks()

  if (json)
    printJson(output, { syncTasks })
  else
    printTasks(output, toTaskRows(syncTasks))

  return 0
}

async function runCreateTask(args, output, operations, runtime) {
  requireArguments(args, 3, 'create-task <server> <local-folder> <remote-folder>')
  const task = createTaskMapping(args[0], args[1], args[2])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.CREATE,
    onProgress => operations.createSyncTask(task, onProgress),
    output,
    runtime,
  )
}

async function runUpdateTask(args, output, operations, runtime) {
  requireArguments(
    args,
    5,
    'update-task <server> <local-folder> <new-server> <new-local-folder> <new-remote-folder>',
  )
  const task = createTaskReference(args[0], args[1])
  const expectedTask = createTaskMapping(args[2], args[3], args[4])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.UPDATE,
    onProgress => operations.updateSyncTask(task, expectedTask, onProgress),
    output,
    runtime,
  )
}

async function runUpdateTaskIgnorePatterns(args, output, operations, runtime) {
  requireArguments(
    args,
    2,
    'update-task-ignore-patterns <server> <local-folder> [pattern ...]',
  )
  const task = createTaskReference(args[0], args[1])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.UPDATE_IGNORE_PATTERNS,
    onProgress => operations.updateSyncTaskIgnorePatterns(task, args.slice(2), onProgress),
    output,
    runtime,
  )
}

async function runDeleteTask(args, output, operations, runtime) {
  requireArguments(args, 2, 'delete-task <server> <local-folder>')
  const task = createTaskReference(args[0], args[1])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.DELETE,
    onProgress => operations.deleteSyncTask(task, onProgress),
    output,
    runtime,
  )
}

async function runListGlobalIgnorePatterns(json, output, operations) {
  const globalIgnorePatterns = await operations.listGlobalIgnorePatterns()

  if (json)
    printJson(output, { globalIgnorePatterns })
  else
    output.log(globalIgnorePatterns.join('\n'))

  return 0
}

async function runUpdateGlobalIgnorePatterns(args, output, operations) {
  await operations.updateGlobalIgnorePatterns(args)
  output.log('Global ignore patterns updated.')
  return 0
}

export async function runCli(argv = process.argv.slice(2), output = console, runtime = {}) {
  const [firstArg, ...restArgs] = argv
  const command = COMMANDS.has(firstArg) ? firstArg : 'sync'
  const commandArgs = command === firstArg ? restArgs : argv
  const json = hasJsonFlag(commandArgs)
  const cleanArgs = stripCliFlags(commandArgs)
  const operations = getOperations(runtime)

  try {
    if (command === 'list-servers')
      return await runListServers(json, output, operations)
    if (command === 'get-server')
      return await runGetServer(cleanArgs, json, output, operations)
    if (command === 'list-server-folders')
      return await runListServerFolders(cleanArgs, json, output, operations)
    if (command === 'test-server')
      return await runTestServer(cleanArgs, output, operations, runtime)
    if (command === 'create-server')
      return await runCreateServer(cleanArgs, output, operations, runtime)
    if (command === 'update-server')
      return await runUpdateServer(cleanArgs, output, operations, runtime)
    if (command === 'delete-server')
      return await runDeleteServer(cleanArgs, output, operations, runtime)
    if (command === 'list-tasks')
      return await runListTasks(json, output, operations)
    if (command === 'create-task')
      return await runCreateTask(cleanArgs, output, operations, runtime)
    if (command === 'update-task')
      return await runUpdateTask(cleanArgs, output, operations, runtime)
    if (command === 'update-task-ignore-patterns')
      return await runUpdateTaskIgnorePatterns(cleanArgs, output, operations, runtime)
    if (command === 'delete-task')
      return await runDeleteTask(cleanArgs, output, operations, runtime)
    if (command === 'list-global-ignore-patterns')
      return await runListGlobalIgnorePatterns(json, output, operations)
    if (command === 'update-global-ignore-patterns')
      return await runUpdateGlobalIgnorePatterns(cleanArgs, output, operations)

    return await runSync(cleanArgs, output, runtime)
  }
  catch (error) {
    output.error(`Error: ${error.message}`)
    if (error.stack && process.env.DEBUG)
      output.error(error.stack)
    return 1
  }
}
