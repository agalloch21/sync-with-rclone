import { SYNC_SESSION_STAGE } from '#electron/contracts/sync-session-stage.js'
import { SYNC_PHASES, SYNC_RESULT } from '#src/core/contract.js'

const syncSession = {
  [SYNC_SESSION_STAGE.ANALYZE]: {
    title: 'Analyze',
    preparing: 'Preparing Sync',
  },
  [SYNC_SESSION_STAGE.REVIEW]: {
    title: 'Review',
    initializing: 'Initializing trees',
    empty: 'No differences found.',
  },
  [SYNC_SESSION_STAGE.SYNC]: { title: 'Sync' },
  [SYNC_PHASES.PREPARATION]: 'Normalizing options',
  [SYNC_PHASES.BUILD_LOCAL_SNAPSHOT]: 'Building local snapshot',
  [SYNC_PHASES.BUILD_REMOTE_SNAPSHOT]: 'Building remote snapshot',
  [SYNC_PHASES.COMPARE_SNAPSHOT]: 'Comparing snapshots',
  [SYNC_PHASES.REVIEW_DIFFERENCES]: 'Preparing differences review',
  [SYNC_PHASES.GENERATE_PLAN]: 'Preparing operations',
  [SYNC_PHASES.APPLY_PLAN]: 'Syncing',
  windowTitle: 'Sync Session',
  context: {
    local: 'LOCAL',
    remote: 'REMOTE',
    source: 'SOURCE',
    target: 'TARGET',
    push: 'PUSH TO',
    pull: 'PULL FROM',
  },
  cancelButton: 'Cancel',
  confirmButton: {
    push: 'Confirm & Push',
    pull: 'Confirm & Pull',
  },
  closeButton: 'Close',
  syncPhases: {
    'start': 'start applying operations',
    'resolve-conflicts': 'resolving destination path conflicts',
    'copy': 'applying copy operations',
    'delete': 'applying delete operations',
    'cleanup': 'cleaning up empty folders',
    'complete': 'syncing completed',
  },
  result: {
    [SYNC_RESULT.COMPLETED]: {
      title: 'Finished',
      message: 'The window will be closed in {count} seconds.',
    },
    [SYNC_RESULT.CANCELLED]: {
      title: 'Cancelled',
      message: '{syncedCount} of {total} operations are applied.',
      detailButton: 'details',
    },
    [SYNC_RESULT.FAILED]: {
      title: 'Error',
      message: 'Synchronization failed.',
      operationSummary: '{syncedCount} synced, {failedCount} failed, and {pendingCount} pending.',
      detailButton: 'details',
      logFolderHint: 'For more information,',
      openLogFolder: 'open the log folder',
    },
  },
  operationStatuses: {
    pending: 'Not applied',
    synced: 'Applied',
    failed: 'Failed',
  },
  operationFailures: {
    operation: {
      local_symbolic_link_boundary: 'Blocked by symbolic link: {symbolicLinkPath}',
      structural_dependency_failed: 'Blocked by related operation: {dependencyPath}',
    },
  },
}

export default syncSession
