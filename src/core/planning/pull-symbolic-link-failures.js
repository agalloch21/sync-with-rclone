import { findLocalSymbolicLinkConflicts } from '#src/infrastructure/filesystem/local-symbolic-links.js'
import {
  SYNC_OPERATION_FAILURE_CODE,
  SYNC_OPERATION_STATUS,
} from '../contract.js'
import { markOperationFailed } from './sync-plan-result.js'

function pathsOverlap(leftPath, rightPath) {
  return leftPath === rightPath
    || leftPath.startsWith(`${rightPath}/`)
    || rightPath.startsWith(`${leftPath}/`)
}

function isOperationFailed(operation) {
  return operation.status === SYNC_OPERATION_STATUS.FAILED
}

function isOperationPending(operation) {
  return operation.status === SYNC_OPERATION_STATUS.PENDING
}

function createSymbolicLinkFailure(symbolicLinkPath) {
  return {
    code: SYNC_OPERATION_FAILURE_CODE.LOCAL_SYMBOLIC_LINK_BOUNDARY,
    meta: { symbolicLinkPath },
  }
}

function createStructuralDependencyFailure(dependencyOperation) {
  return {
    code: SYNC_OPERATION_FAILURE_CODE.STRUCTURAL_DEPENDENCY_FAILED,
    meta: {
      dependencyPath: dependencyOperation.path,
      symbolicLinkPath: dependencyOperation.failure?.meta?.symbolicLinkPath,
    },
  }
}

function blockFailedStructuralDependencies(preCopyDeleteOperations, copyOperations) {
  let changed = true

  while (changed) {
    changed = false

    for (const deleteOperation of preCopyDeleteOperations) {
      for (const copyOperation of copyOperations) {
        if (!pathsOverlap(deleteOperation.path, copyOperation.path))
          continue

        if (isOperationFailed(deleteOperation) && isOperationPending(copyOperation)) {
          markOperationFailed(copyOperation, createStructuralDependencyFailure(deleteOperation))
          changed = true
        }
        else if (isOperationPending(deleteOperation) && isOperationFailed(copyOperation)) {
          markOperationFailed(deleteOperation, createStructuralDependencyFailure(copyOperation))
          changed = true
        }
      }
    }
  }
}

/**
 * Pull-only symbolic-link boundary policy.
 *
 * Direct paths crossing an existing internal symbolic link are marked failed.
 * Structural deletes and copies that depend on those paths are also blocked,
 * so the remaining plan cannot delete a conflict without completing its copy.
 *
 * This exceptional local-filesystem policy is deliberately isolated from
 * generic plan batching so it can be changed or removed independently.
 */
export async function markPullSymbolicLinkFailures(
  context,
  operations,
  preCopyDeleteOperations,
  copyOperations,
  cancelSignal = null,
) {
  if (context.mode !== 'pull')
    return

  const conflicts = await findLocalSymbolicLinkConflicts(
    context.localFolderPath,
    operations.map(operation => operation.path),
    cancelSignal,
  )

  for (const operation of operations) {
    const conflict = conflicts.get(operation.path)
    if (conflict)
      markOperationFailed(operation, createSymbolicLinkFailure(conflict.symbolicLinkPath))
  }

  blockFailedStructuralDependencies(preCopyDeleteOperations, copyOperations)
}
