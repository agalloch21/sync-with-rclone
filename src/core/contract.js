export const PHASES = {
  PREPARATION: 'preparation',
  BUILD_LOCAL_SNAPSHOT: 'build-local-snapshot',
  BUILD_REMOTE_SNAPSHOT: 'build-remote-snapshot',
  COMPARE_SNAPSHOT: 'compare-snapshot',
  REVIEW_DIFFERENCES: 'review-differences',
  GENERATE_PLAN: 'generate-plan',
  APPLY_PLAN: 'apply-plan',
}

export const PHASE_EVENT = {
  STARTED: 'phase.started',
  PROGRESS: 'phase.progress',
  DONE: 'phase.done',
  FAILED: 'phase.failed',
  CANCELLED: 'phase.cancelled',
}

export const SYNC_MODE = {
  PUSH: 'push',
  PULL: 'pull',
}

export const REVIEW_ACTION = {
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
 * @typedef {object} SyncCoreOptions
 * @property {'push' | 'pull'} mode
 * @property {string} localFolderPath
 * @property {string} remoteFolderPath
 * @property {string[]} [extraIgnorePatterns]
 * @property {object} [runtimePaths]
 */

/**
 * @typedef {object} SyncCoreEventRuntime
 * @property {(event: SyncCoreEvent) => void} [eventListener]
 */

/**
 * @typedef {object} SyncCoreInteractions
 * @property {(diffSnapshot: import('#src/domain/synchronization/snapshot.js').DiffSnapshot) => Promise<import('#src/app/sync-session/review-contracts.js').ReviewResult>} [reviewDiff]
 */

/**
 * @typedef {object} SyncCoreDependents
 * @property {(command: string, args: string[], options?: { cancelSignal?: AbortSignal, onOutput?: (output: string) => void }) => Promise<{ stdout?: string, stderr?: string } | void>} [runCommand]
 */

/**
 * @typedef {object} SyncCoreRuntime
 * @property {SyncCoreEventRuntime} [events]
 * @property {SyncCoreInteractions} [interactions]
 * @property {SyncCoreDependents} [dependents]
 */

/**
 * @typedef {object} ApplyProgressMeasurement
 * @property {number} current
 * @property {number} total
 * @property {'bytes'} unit
 */

/**
 * @typedef {object} ApplyProgress
 * @property {'start' | 'copy' | 'delete' | 'cleanup' | 'complete'} activity
 * @property {number} index
 * @property {number} total
 * @property {ApplyProgressMeasurement | null} measurement
 */

/**
 * @typedef {object} SyncCorePhaseEvent
 * @property {'phase'} type
 * @property {string} phase
 * @property {'started' | 'running' | 'done' | 'failed' | 'cancelled'} status
 * @property {string} message
 * @property {ApplyProgress} [progress]
 */

/**
 * @typedef {SyncCorePhaseEvent} SyncCoreEvent
 */

/**
 * @typedef {object} SyncCoreCompletedResult
 * @property {'completed'} result
 * @property {{ added: number, modified: number, deleted: number }} summary
 * @property {Array<object>} operations
 */

/**
 * @typedef {object} SyncCoreCancelledResult
 * @property {'cancelled'} result
 * @property {'review-cancelled' | 'abort-signal'} reason
 * @property {{ added: number, modified: number, deleted: number }} [summary]
 * @property {Array<object>} [operations]
 */

/**
 * @typedef {object} SyncCoreFailedResult
 * @property {'failed'} result
 * @property {string} message
 * @property {string | null} phase
 * @property {unknown} error
 * @property {Array<object>} [operations]
 */

/**
 * @typedef {SyncCoreCompletedResult | SyncCoreCancelledResult | SyncCoreFailedResult} SyncCoreResult
 */
