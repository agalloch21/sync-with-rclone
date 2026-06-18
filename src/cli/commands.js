import { loadAppModel } from '#src/app/app-model.js'
import { parseSyncArgs } from '#src/app/sync-session/parse-sync-args.js'
import { startSync } from '#src/app/sync-session/start-sync.js'
import { getRcloneRemoteAddress, listRcloneRemotes } from '#src/app/rclone-config.js'
import { SYNC_RESULT } from '#src/core/contract.js'
import { reviewDiffInCli } from './review.js'

const COMMANDS = new Set(['sync', 'list-servers', 'list-tasks'])

function hasJsonFlag(argv) {
  return argv.includes('--json')
}

function stripCliFlags(argv) {
  return argv.filter(arg => arg !== '--json')
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

function printServers(output, remotes) {
  output.log(stringifyTable(remotes, [
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

function toServerRows(remotes) {
  return remotes.map(remote => ({
    ...remote,
    address: getRcloneRemoteAddress(remote),
  }))
}

function toTaskRows(syncTasks) {
  return syncTasks.map(task => ({
    ...task,
    remotePath: `${task.rcloneRemote}:${task.remoteBasePath}`,
    lastSync: [task.lastSyncMode, task.lastSyncDate, task.lastSyncFolder].filter(Boolean).join(' | ') || '-',
  }))
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

async function runListServers(json, output, runtime) {
  const runListRcloneRemotes = runtime?.dependents?.listRcloneRemotes || listRcloneRemotes
  const remotes = await runListRcloneRemotes()

  if (json) {
    printJson(output, { servers: remotes })
    return 0
  }

  printServers(output, toServerRows(remotes))
  return 0
}

async function runListTasks(json, output, runtime) {
  const runLoadAppModel = runtime?.dependents?.loadAppModel || loadAppModel
  const model = await runLoadAppModel()

  if (json) {
    printJson(output, {
      globalIgnorePatterns: model.globalIgnorePatterns,
      syncTasks: model.syncTasks,
    })
    return 0
  }

  printTasks(output, toTaskRows(model.syncTasks))
  return 0
}

export async function runCli(argv = process.argv.slice(2), output = console, runtime = {}) {
  const [firstArg, ...restArgs] = argv
  const command = COMMANDS.has(firstArg) ? firstArg : 'sync'
  const commandArgs = command === firstArg ? restArgs : argv
  const json = hasJsonFlag(commandArgs)
  const cleanArgs = stripCliFlags(commandArgs)

  try {
    if (command === 'list-servers')
      return runListServers(json, output, runtime)

    if (command === 'list-tasks')
      return runListTasks(json, output, runtime)

    return runSync(cleanArgs, output, runtime)
  }
  catch (error) {
    output.error(`Error: ${error.message}`)
    if (error.stack && process.env.DEBUG)
      output.error(error.stack)
    return 1
  }
}
