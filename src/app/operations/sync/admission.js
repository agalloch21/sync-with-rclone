import crypto from 'node:crypto'
import { getLocalPathComparisonKey } from '#src/infrastructure/filesystem/local-path.js'
import { remoteFolderPathsOverlap } from '#src/infrastructure/rclone/remote-path.js'
import { acquireSyncLease, releaseSyncLease } from '#src/infrastructure/runtime/sync-lease-store.js'
import { APP_ERROR_CODE, throwAppError } from '../../app-errors.js'

function isSameOrNested(left, right) {
  if (left === right)
    return true
  if (!left || !right || left === '/' || right === '/')
    return true
  return left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

function localPathsOverlap(left, right, platform = process.platform) {
  return isSameOrNested(
    getLocalPathComparisonKey(left, platform),
    getLocalPathComparisonKey(right, platform),
  )
}

export function syncAdmissionsOverlap(left, right, platform = process.platform) {
  return localPathsOverlap(left.localFolderPath, right.localFolderPath, platform)
    || remoteFolderPathsOverlap(left.remoteFolderPath, right.remoteFolderPath)
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
