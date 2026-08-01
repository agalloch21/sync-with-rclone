import crypto from 'node:crypto'
import { acquireSyncLease, releaseSyncLease } from '#src/infrastructure/runtime/sync-lease-store.js'
import { APP_ERROR_CODE, throwAppError } from '../../app-errors.js'

function trimPath(value) {
  const normalized = String(value || '').replaceAll('\\', '/')
  if (normalized === '/')
    return normalized
  return normalized.replace(/\/+$/, '')
}

function normalizeLocalPath(value, platform = process.platform) {
  const normalized = trimPath(value)
  return platform === 'win32' ? normalized.toLowerCase() : normalized
}

function parseRemotePath(value) {
  const normalized = trimPath(value)
  const separatorIndex = normalized.indexOf(':')
  if (separatorIndex < 0)
    return { remote: '', folderPath: normalized }

  return {
    remote: normalized.slice(0, separatorIndex),
    folderPath: normalized.slice(separatorIndex + 1).replace(/^\/+/, ''),
  }
}

function isSameOrNested(left, right) {
  if (left === right)
    return true
  if (!left || !right || left === '/' || right === '/')
    return true
  return left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

function localPathsOverlap(left, right, platform = process.platform) {
  return isSameOrNested(
    normalizeLocalPath(left, platform),
    normalizeLocalPath(right, platform),
  )
}

function remotePathsOverlap(left, right) {
  const leftRemote = parseRemotePath(left)
  const rightRemote = parseRemotePath(right)
  return leftRemote.remote === rightRemote.remote
    && isSameOrNested(leftRemote.folderPath, rightRemote.folderPath)
}

export function syncAdmissionsOverlap(left, right, platform = process.platform) {
  return localPathsOverlap(left.localFolderPath, right.localFolderPath, platform)
    || remotePathsOverlap(left.remoteFolderPath, right.remoteFolderPath)
}

function toDescriptor(context) {
  return {
    localFolderPath: context.localFolderPath,
    remoteFolderPath: context.remoteFolderPath,
  }
}

export async function acquireSyncAdmission(context, runtimePaths) {
  const descriptor = toDescriptor(context)
  const candidate = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    pid: process.pid,
    ...descriptor,
    startedAt: new Date().toISOString(),
  }
  const result = await acquireSyncLease(candidate, syncAdmissionsOverlap, runtimePaths)

  if (!result.acquired) {
    throwAppError(
      APP_ERROR_CODE.SYNC_SESSION_OVERLAP,
      'Another sync session is already using an overlapping local or remote folder.',
      {
        meta: {
          requested: descriptor,
          active: toDescriptor(result.conflict),
        },
      },
    )
  }

  return result.lease
}

export async function releaseSyncAdmission(admission, runtimePaths) {
  await releaseSyncLease(admission, runtimePaths)
}
