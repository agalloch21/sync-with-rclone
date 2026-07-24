import { PHASES, SYNC_RESULT } from '#src/core/contract.js'
import { STEPS } from '#src/electron/main/sync-session/steps.js'

const syncSession = {
  [STEPS.ANALYZE]: { title: 'Analyze' },
  [STEPS.REVIEW]: { title: 'Review' },
  [STEPS.SYNC]: { title: 'Sync' },
  [PHASES.PREPARATION]: 'Normalizing options',
  [PHASES.BUILD_LOCAL_SNAPSHOT]: 'Building local snapshot',
  [PHASES.BUILD_REMOTE_SNAPSHOT]: 'Building remote snapshot',
  [PHASES.COMPARE_SNAPSHOT]: 'Comparing snapshots',
  [PHASES.REVIEW_DIFFERENCES]: 'Preparing differences review',
  [PHASES.GENERATE_PLAN]: 'Preparing operations',
  [PHASES.APPLY_PLAN]: 'Syncing',
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
