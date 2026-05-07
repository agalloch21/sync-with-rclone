import { PHASES, SYNC_RESULT } from '#src/core/contract.js'
import { STEPS } from '#src/electron/main/session-steps.js'

export default {
  [STEPS.ANALYZE]: {
    title: 'Analyze',
  },
  [STEPS.REVIEW]: {
    title: 'Review',
  },
  [STEPS.SYNC]: {
    title: 'Sync',
  },
  [PHASES.PREPARATION]: 'Normalizing options',
  [PHASES.BUILD_LOCAL_SNAPSHOT]: 'Building local snapshot',
  [PHASES.BUILD_REMOTE_SNAPSHOT]: 'Building remote snapshot',
  [PHASES.COMPARE_SNAPSHOT]: 'Comparing snapshots',
  [PHASES.REVIEW_DIFFERENCES]: 'Preparing differences review',
  [PHASES.GENERATE_PLAN]: 'Preparing operations',
  [PHASES.APPLY_PLAN]: 'Applying operations',

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
    start: 'start applying execution phases',
    mkdir: 'creating directories',
    copy: 'copying files',
    delete: 'deleting files',
    rmdir: 'deleting directories',
    complete: 'complete applying execution phases',
  },
  result: {
    [SYNC_RESULT.COMPLETED]: {
      title: 'Finished',
      message: 'The window will be closed in <u>#</u> seconds.',
    },
    [SYNC_RESULT.CANCELLED]: {
      title: 'Cancelled',
      message: '',
    },
    [SYNC_RESULT.FAILED]: {
      title: 'Error',
      message: '',
    },
  },
}
