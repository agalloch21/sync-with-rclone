import { parseSyncArgs } from '#shell/parse-sync-args.js'
import * as appApi from '#src/app/app-api.js'
import { MAPPING_OPERATION } from '#src/app/contracts/mapping.js'
import { SERVER_OPERATION } from '#src/app/contracts/server.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'
import { SYNC_OPERATION_STATUS, SYNC_RESULT } from '#src/core/contract.js'
import commandContract from './command-contract.cjs'
import { createCliOperationReportDisplay } from './operation-report-display.js'
import { reviewDiffInCli } from './sync-review.js'

const { CLI_COMMAND, CLI_COMMAND_NAMES } = commandContract

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

function createMappingReference(serverName, localFolderPath) {
  return {
    rcloneRemote: serverName,
    localBasePath: localFolderPath,
  }
}

function createMapping(serverName, localFolderPath, remoteFolderPath) {
  return {
    ...createMappingReference(serverName, localFolderPath),
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

function printMappings(output, mappings) {
  output.log(stringifyTable(mappings, [
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

function toMappingRows(mappings) {
  return mappings.map(mapping => ({
    ...mapping,
    remotePath: `${mapping.rcloneRemote}:${mapping.remoteBasePath}`,
    lastSync: [mapping.lastSyncMode, mapping.lastSyncDate, mapping.lastSyncFolder].filter(Boolean).join(' | ') || '-',
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
  const bypassConfirmation = argv.includes('--yes')
  const options = parseSyncArgs(argv.filter(arg => arg !== '--yes'))
  const result = await appApi.startSync(options, {
    interactions: {
      reviewDiff: diffSnapshot => reviewDiffInCli(diffSnapshot, { bypassConfirmation }),
    },
  })

  if (result.result === SYNC_RESULT.FAILED) {
    output.error(`Error: ${result.error?.message || 'Synchronization failed.'}`)
    for (const operation of result.operations || []) {
      if (operation.status === SYNC_OPERATION_STATUS.FAILED) {
        const reason = operation.failure?.code ? ` (${operation.failure.code})` : ''
        output.error(`Failed: ${operation.path}${reason}`)
      }
    }
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
  requireArguments(args, 2, 'update-server <server> <protocol> [field=value ...]')
  const [name, protocolType, ...fieldEntries] = args
  const protocolFields = parseProtocolFields(fieldEntries)
  return await runReportedOperation(
    SERVER_OPERATION.UPDATE,
    onProgress => appApi.updateServer(name, protocolType, protocolFields, onProgress),
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

async function runListMappings(json, output) {
  const mappings = await appApi.listMappings()

  if (json)
    printJson(output, { mappings })
  else
    printMappings(output, toMappingRows(mappings))

  return 0
}

async function runCreateMapping(args, output) {
  requireArguments(args, 3, 'create-mapping <server> <local-folder> <remote-folder>')
  const mapping = createMapping(args[0], args[1], args[2])
  return await runReportedOperation(
    MAPPING_OPERATION.CREATE,
    onProgress => appApi.createMapping(mapping, onProgress),
    output,
  )
}

async function runUpdateMapping(args, output) {
  requireArguments(
    args,
    5,
    'update-mapping <server> <local-folder> <new-server> <new-local-folder> <new-remote-folder>',
  )
  const mapping = createMappingReference(args[0], args[1])
  const expectedMapping = createMapping(args[2], args[3], args[4])
  return await runReportedOperation(
    MAPPING_OPERATION.UPDATE,
    onProgress => appApi.updateMapping(mapping, expectedMapping, onProgress),
    output,
  )
}

async function runUpdateMappingExclusionPatterns(args, output) {
  requireArguments(
    args,
    2,
    'update-mapping-exclusion-patterns <server> <local-folder> [pattern ...]',
  )
  const mapping = createMappingReference(args[0], args[1])
  return await runReportedOperation(
    MAPPING_OPERATION.UPDATE_EXCLUSION_PATTERNS,
    onProgress => appApi.updateMappingExclusionPatterns(mapping, args.slice(2), onProgress),
    output,
  )
}

async function runDeleteMapping(args, output) {
  requireArguments(args, 2, 'delete-mapping <server> <local-folder>')
  const mapping = createMappingReference(args[0], args[1])
  return await runReportedOperation(
    MAPPING_OPERATION.DELETE,
    onProgress => appApi.deleteMapping(mapping, onProgress),
    output,
  )
}

async function runListGlobalExclusionPatterns(json, output) {
  const globalExclusionPatterns = await appApi.listGlobalExclusionPatterns()

  if (json)
    printJson(output, { globalExclusionPatterns })
  else
    output.log(globalExclusionPatterns.join('\n'))

  return 0
}

async function runUpdateGlobalExclusionPatterns(args, output) {
  await appApi.updateGlobalExclusionPatterns(args)
  output.log('Global exclusions updated.')
  return 0
}

const COMMAND_HANDLERS = new Map([
  [CLI_COMMAND.SYNC, ({ args, output }) => runSync(args, output)],
  [CLI_COMMAND.LIST_SERVERS, ({ json, output }) => runListServers(json, output)],
  [CLI_COMMAND.GET_SERVER, ({ args, json, output }) => runGetServer(args, json, output)],
  [CLI_COMMAND.LIST_SERVER_FOLDERS, ({ args, json, output }) => runListServerFolders(args, json, output)],
  [CLI_COMMAND.TEST_SERVER, ({ args, output }) => runTestServer(args, output)],
  [CLI_COMMAND.CREATE_SERVER, ({ args, output }) => runCreateServer(args, output)],
  [CLI_COMMAND.UPDATE_SERVER, ({ args, output }) => runUpdateServer(args, output)],
  [CLI_COMMAND.DELETE_SERVER, ({ args, output }) => runDeleteServer(args, output)],
  [CLI_COMMAND.LIST_MAPPINGS, ({ json, output }) => runListMappings(json, output)],
  [CLI_COMMAND.CREATE_MAPPING, ({ args, output }) => runCreateMapping(args, output)],
  [CLI_COMMAND.UPDATE_MAPPING, ({ args, output }) => runUpdateMapping(args, output)],
  [CLI_COMMAND.UPDATE_MAPPING_EXCLUSION_PATTERNS, ({ args, output }) => runUpdateMappingExclusionPatterns(args, output)],
  [CLI_COMMAND.DELETE_MAPPING, ({ args, output }) => runDeleteMapping(args, output)],
  [CLI_COMMAND.LIST_GLOBAL_EXCLUSION_PATTERNS, ({ json, output }) => runListGlobalExclusionPatterns(json, output)],
  [CLI_COMMAND.UPDATE_GLOBAL_EXCLUSION_PATTERNS, ({ args, output }) => runUpdateGlobalExclusionPatterns(args, output)],
])

if (COMMAND_HANDLERS.size !== CLI_COMMAND_NAMES.length)
  throw new Error('CLI command contract and handler registry are inconsistent')

export async function runCli(argv = process.argv.slice(2), output = console) {
  const [firstArg, ...restArgs] = argv

  try {
    const handler = COMMAND_HANDLERS.get(firstArg)
    if (!handler)
      throw new Error(`Unknown command: ${firstArg || '(missing)'}`)

    const json = hasJsonFlag(restArgs)
    const args = stripCliFlags(restArgs)
    return await handler({ args, json, output })
  }
  catch (error) {
    output.error(`Error: ${error.message}`)
    if (error.stack && process.env.DEBUG)
      output.error(error.stack)
    return 1
  }
}
