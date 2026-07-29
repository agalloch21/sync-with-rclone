import * as appApi from '#src/app/app-api.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'
import { SERVER_OPERATION } from '#src/app/operations/server-operation-contract.js'
import { SYNC_TASK_OPERATION } from '#src/app/operations/task-operation-contract.js'
import { parseSyncArgs } from '#src/app/sync-session/parse-sync-args.js'
import { SYNC_RESULT } from '#src/core/contract.js'
import CLI_COMMAND_NAMES from './command-names.cjs'
import { createCliOperationReportDisplay } from './operation-report-display.js'
import { reviewDiffInCli } from './review.js'

const COMMANDS = new Set(CLI_COMMAND_NAMES)

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

async function runReportedOperation(operation, execute, output) {
  const display = createCliOperationReportDisplay({ output })
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

async function runSync(argv, output) {
  const options = parseSyncArgs(argv)
  const result = await appApi.startSync(options, {
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

async function runListServers(json, output) {
  const servers = await appApi.listServers()

  if (json)
    printJson(output, { servers })
  else
    printServers(output, servers)

  return 0
}

async function runGetServer(args, json, output) {
  requireArguments(args, 1, 'get-server <server>')
  const server = await appApi.getServer(args[0])

  if (json)
    printJson(output, { server })
  else
    printServers(output, [server])

  return 0
}

async function runListServerFolders(args, json, output) {
  requireArguments(args, 1, 'list-server-folders <server> [folder]')
  const tree = await appApi.getFolderTree(args[0], args[1] || '')

  if (json)
    printJson(output, { tree })
  else
    output.log(flattenFolderPaths(tree).join('\n'))

  return 0
}

async function runTestServer(args, output) {
  requireArguments(args, 1, 'test-server <server>')
  await appApi.testServerConnection(args[0])
  output.log('Server connection test succeeded.')
  return 0
}

async function runCreateServer(args, output) {
  requireArguments(args, 2, 'create-server <server> <protocol> [field=value ...]')
  const [name, protocolType, ...fieldEntries] = args
  const protocolFields = parseProtocolFields(fieldEntries)
  return await runReportedOperation(
    SERVER_OPERATION.CREATE,
    onProgress => appApi.createServer(name, protocolType, protocolFields, onProgress),
    output,
  )
}

async function runUpdateServer(args, output) {
  requireArguments(args, 3, 'update-server <server> <new-server> <protocol> [field=value ...]')
  const [name, expectedName, protocolType, ...fieldEntries] = args
  const protocolFields = parseProtocolFields(fieldEntries)
  return await runReportedOperation(
    SERVER_OPERATION.UPDATE,
    onProgress => appApi.updateServer(name, expectedName, protocolType, protocolFields, onProgress),
    output,
  )
}

async function runDeleteServer(args, output) {
  requireArguments(args, 1, 'delete-server <server>')
  return await runReportedOperation(
    SERVER_OPERATION.DELETE,
    onProgress => appApi.deleteServer(args[0], onProgress),
    output,
  )
}

async function runListTasks(json, output) {
  const syncTasks = await appApi.listSyncTasks()

  if (json)
    printJson(output, { syncTasks })
  else
    printTasks(output, toTaskRows(syncTasks))

  return 0
}

async function runCreateTask(args, output) {
  requireArguments(args, 3, 'create-task <server> <local-folder> <remote-folder>')
  const task = createTaskMapping(args[0], args[1], args[2])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.CREATE,
    onProgress => appApi.createSyncTask(task, onProgress),
    output,
  )
}

async function runUpdateTask(args, output) {
  requireArguments(
    args,
    5,
    'update-task <server> <local-folder> <new-server> <new-local-folder> <new-remote-folder>',
  )
  const task = createTaskReference(args[0], args[1])
  const expectedTask = createTaskMapping(args[2], args[3], args[4])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.UPDATE,
    onProgress => appApi.updateSyncTask(task, expectedTask, onProgress),
    output,
  )
}

async function runUpdateTaskIgnorePatterns(args, output) {
  requireArguments(
    args,
    2,
    'update-task-ignore-patterns <server> <local-folder> [pattern ...]',
  )
  const task = createTaskReference(args[0], args[1])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.UPDATE_IGNORE_PATTERNS,
    onProgress => appApi.updateSyncTaskIgnorePatterns(task, args.slice(2), onProgress),
    output,
  )
}

async function runDeleteTask(args, output) {
  requireArguments(args, 2, 'delete-task <server> <local-folder>')
  const task = createTaskReference(args[0], args[1])
  return await runReportedOperation(
    SYNC_TASK_OPERATION.DELETE,
    onProgress => appApi.deleteSyncTask(task, onProgress),
    output,
  )
}

async function runListGlobalIgnorePatterns(json, output) {
  const globalIgnorePatterns = await appApi.listGlobalIgnorePatterns()

  if (json)
    printJson(output, { globalIgnorePatterns })
  else
    output.log(globalIgnorePatterns.join('\n'))

  return 0
}

async function runUpdateGlobalIgnorePatterns(args, output) {
  await appApi.updateGlobalIgnorePatterns(args)
  output.log('Global ignore patterns updated.')
  return 0
}

export async function runCli(argv = process.argv.slice(2), output = console) {
  const [firstArg, ...restArgs] = argv

  try {
    if (!COMMANDS.has(firstArg))
      throw new Error(`Unknown command: ${firstArg || '(missing)'}`)

    const command = firstArg
    const json = hasJsonFlag(restArgs)
    const cleanArgs = stripCliFlags(restArgs)

    if (command === 'list-servers')
      return await runListServers(json, output)
    if (command === 'get-server')
      return await runGetServer(cleanArgs, json, output)
    if (command === 'list-server-folders')
      return await runListServerFolders(cleanArgs, json, output)
    if (command === 'test-server')
      return await runTestServer(cleanArgs, output)
    if (command === 'create-server')
      return await runCreateServer(cleanArgs, output)
    if (command === 'update-server')
      return await runUpdateServer(cleanArgs, output)
    if (command === 'delete-server')
      return await runDeleteServer(cleanArgs, output)
    if (command === 'list-tasks')
      return await runListTasks(json, output)
    if (command === 'create-task')
      return await runCreateTask(cleanArgs, output)
    if (command === 'update-task')
      return await runUpdateTask(cleanArgs, output)
    if (command === 'update-task-ignore-patterns')
      return await runUpdateTaskIgnorePatterns(cleanArgs, output)
    if (command === 'delete-task')
      return await runDeleteTask(cleanArgs, output)
    if (command === 'list-global-ignore-patterns')
      return await runListGlobalIgnorePatterns(json, output)
    if (command === 'update-global-ignore-patterns')
      return await runUpdateGlobalIgnorePatterns(cleanArgs, output)

    return await runSync(cleanArgs, output)
  }
  catch (error) {
    output.error(`Error: ${error.message}`)
    if (error.stack && process.env.DEBUG)
      output.error(error.stack)
    return 1
  }
}
