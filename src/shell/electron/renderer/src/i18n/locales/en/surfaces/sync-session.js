import { SYNC_SESSION_STAGE } from '#electron/contracts/sync-session-stage.js'
import { SYNC_PHASES, SYNC_RESULT } from '#src/core/contract.js'

const syncSession = {
  [SYNC_SESSION_STAGE.ANALYZE]: { title: 'Analyze' },
  [SYNC_SESSION_STAGE.REVIEW]: { title: 'Review' },
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
    start: 'start applying operations',
    copy: 'applying copy operations',
    delete: 'applying delete operations',
    cleanup: 'cleaning up empty folders',
    complete: 'syncing completed',
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
      message: '',
      logPath: 'For more information, please check',
    },
  },
}

export default syncSession
