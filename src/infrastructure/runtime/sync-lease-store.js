import fs from 'node:fs/promises'
import path from 'node:path'
import { withFileMutex } from './file-mutex.js'

const LEASE_DIRECTORY_NAME = 'leases'
const MUTEX_FILE_NAME = 'registry.lock'

function getStorePaths(runtimePaths) {
  if (!runtimePaths?.syncAdmissionDirectory)
    throw new TypeError('Sync admission requires runtimePaths.syncAdmissionDirectory.')

  const directory = runtimePaths.syncAdmissionDirectory
  return {
    directory,
    leaseDirectory: path.join(directory, LEASE_DIRECTORY_NAME),
    mutexPath: path.join(directory, MUTEX_FILE_NAME),
  }
}

function isSyncLease(value) {
  return value
    && value.schemaVersion === 1
    && typeof value.id === 'string'
    && Number.isInteger(value.pid)
    && value.pid > 0
    && typeof value.localFolderPath === 'string'
    && typeof value.remoteFolderPath === 'string'
    && typeof value.startedAt === 'string'
}

function isProcessAlive(pid) {
  if (pid === process.pid)
    return true

  try {
    process.kill(pid, 0)
    return true
  }
  catch (error) {
    return error?.code === 'EPERM'
  }
}

async function readLease(leasePath) {
  try {
    const content = await fs.readFile(leasePath, 'utf8')
    const lease = JSON.parse(content)
    return isSyncLease(lease) ? lease : null
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return null
    if (error instanceof SyntaxError)
      return null
    throw error
  }
}

async function removeLeaseFile(leasePath) {
  try {
    await fs.unlink(leasePath)
  }
  catch (error) {
    if (error?.code !== 'ENOENT')
      throw error
  }
}

async function readActiveLeases(leaseDirectory) {
  const entries = await fs.readdir(leaseDirectory, { withFileTypes: true })
  const activeLeases = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json'))
      continue

    const leasePath = path.join(leaseDirectory, entry.name)
    const lease = await readLease(leasePath)
    if (!lease || !isProcessAlive(lease.pid)) {
      await removeLeaseFile(leasePath)
      continue
    }

    activeLeases.push(lease)
  }

  return activeLeases
}

export async function acquireSyncLease(candidate, conflictsWith, runtimePaths) {
  if (!isSyncLease(candidate))
    throw new TypeError('Invalid sync lease candidate.')
  if (typeof conflictsWith !== 'function')
    throw new TypeError('Sync admission requires a conflict predicate.')

  const storePaths = getStorePaths(runtimePaths)
  await fs.mkdir(storePaths.leaseDirectory, { recursive: true })

  return await withFileMutex(storePaths.mutexPath, async () => {
    const activeLeases = await readActiveLeases(storePaths.leaseDirectory)
    const conflict = activeLeases.find(activeLease => conflictsWith(candidate, activeLease)) || null
    if (conflict)
      return { acquired: false, conflict }

    const leasePath = path.join(storePaths.leaseDirectory, `${candidate.id}.json`)
    await fs.writeFile(leasePath, JSON.stringify(candidate), { encoding: 'utf8', flag: 'wx' })
    return { acquired: true, lease: candidate }
  })
}

export async function releaseSyncLease(lease, runtimePaths) {
  if (!isSyncLease(lease))
    throw new TypeError('Invalid sync lease.')

  const { leaseDirectory } = getStorePaths(runtimePaths)
  await removeLeaseFile(path.join(leaseDirectory, `${lease.id}.json`))
}
