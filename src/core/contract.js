export const SYNC_PHASES = {
  PREPARATION: 'preparation',
  BUILD_LOCAL_SNAPSHOT: 'build-local-snapshot',
  BUILD_REMOTE_SNAPSHOT: 'build-remote-snapshot',
  COMPARE_SNAPSHOT: 'compare-snapshot',
  REVIEW_DIFFERENCES: 'review-differences',
  GENERATE_PLAN: 'generate-plan',
  APPLY_PLAN: 'apply-plan',
}

export const SYNC_PHASE_EVENT = {
  STARTED: 'sync.phase.started',
  PROGRESS: 'sync.phase.progress',
  DONE: 'sync.phase.done',
  FAILED: 'sync.phase.failed',
  CANCELLED: 'sync.phase.cancelled',
}

export const SYNC_REVIEW_ACTION = {
  CONFIRM: 'confirm',
  CANCEL: 'cancel',
}

export const SYNC_CANCEL_REASON = {
  REVIEW_CANCELLED: 'review-cancelled',
  ABORT_SIGNAL: 'abort-signal',
}

export const SYNC_RESULT = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
}

/**
 * @typedef {object} SyncSessionContext
 * @property {'push' | 'pull'} mode
 * @property {string} localFolderPath
 * @property {string} remoteFolderPath
 * @property {string[]} extraIgnorePatterns
 */

/**
 * @typedef {SyncSessionContext & { runtimePaths?: object }} SyncExecutionOptions
 */

/**
 * @typedef {object} SyncSessionEventRuntime
 * @property {(event: SyncSessionEvent) => void} [eventListener]
 */

/**
 * @typedef {object} SyncSessionInteractions
 * @property {(diffSnapshot: import('./snapshots/snapshot.js').DiffSnapshot) => Promise<ReviewResult>} [reviewDiff]
 */

/**
 * @typedef {'confirm' | 'cancel'} ReviewAction
 */

/**
 * Minimal review result contract returned from CLI or Electron review.
 *
 * @typedef {object} ReviewResult
 * @property {ReviewAction} action
 * @property {string[]} [selectedPaths]
 */

/**
 * @typedef {object} SyncSessionRuntime
 * @property {SyncSessionEventRuntime} [events]
 * @property {SyncSessionInteractions} [interactions]
 */

/**
 * @typedef {object} SyncSessionApplyProgressMeasurement
 * @property {number} current
 * @property {number} total
 * @property {'bytes'} unit
 */

/**
 * @typedef {object} SyncSessionApplyProgress
 * @property {'start' | 'resolve-conflicts' | 'copy' | 'delete' | 'cleanup' | 'complete'} activity
 * @property {number} index
 * @property {number} total
 * @property {SyncSessionApplyProgressMeasurement | null} measurement
 */

/**
 * @typedef {object} SyncPhaseEvent
 * @property {'sync.phase.started' | 'sync.phase.progress' | 'sync.phase.done' | 'sync.phase.failed' | 'sync.phase.cancelled'} type
 * @property {string} phase
 * @property {string} message
 * @property {SyncSessionApplyProgress} [progress]
 */

/**
 * @typedef {object} SyncExecutionEventRuntime
 * @property {(event: SyncPhaseEvent) => void} [eventListener]
 */

/**
 * @typedef {object} SyncExecutionRuntime
 * @property {SyncExecutionEventRuntime} [events]
 * @property {SyncSessionInteractions} [interactions]
 */

/**
 * @typedef {object} SyncExecutionCompletedResult
 * @property {'completed'} result
 * @property {{ added: number, modified: number, deleted: number }} summary
 * @property {Array<object>} operations
 */

/**
 * @typedef {object} SyncExecutionCancelledResult
 * @property {'cancelled'} result
 * @property {'review-cancelled' | 'abort-signal'} reason
 * @property {{ added: number, modified: number, deleted: number }} [summary]
 * @property {Array<object>} [operations]
 */

/**
 * @typedef {object} SyncExecutionFailedResult
 * @property {'failed'} result
 * @property {unknown} error
 * @property {Array<object>} [operations]
 */

/**
 * @typedef {SyncExecutionCompletedResult | SyncExecutionCancelledResult | SyncExecutionFailedResult} SyncExecutionResult
 */
