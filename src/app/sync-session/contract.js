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

export const SYNC_SESSION_EVENT = {
  STARTED: 'sync.session.started',
  CONTEXT_RESOLVED: 'sync.session.context-resolved',
  PROGRESS: 'sync.session.progress',
  RESULT: 'sync.session.result',
}

export const SYNC_SESSION_OPERATION = {
  PUSH: 'syncPush',
  PULL: 'syncPull',
  UNKNOWN: 'sync',
}

/**
 * @typedef {object} AppSyncOptions
 * @property {'push' | 'pull'} mode
 * @property {string} localFolderPath
 * @property {string} [remoteFolderPath]
 * @property {boolean} [bypassConfig]
 */

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
 * @property {(diffSnapshot: import('#src/domain/synchronization/snapshot.js').DiffSnapshot) => Promise<ReviewResult>} [reviewDiff]
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
 * @typedef {object} SyncSessionDependents
 * @property {(command: string, args: string[], options?: { cancelSignal?: AbortSignal, onOutput?: (output: string) => void }) => Promise<{ stdout?: string, stderr?: string } | void>} [runCommand]
 */

/**
 * @typedef {object} SyncSessionRuntime
 * @property {SyncSessionEventRuntime} [events]
 * @property {SyncSessionInteractions} [interactions]
 * @property {SyncSessionDependents} [dependents]
 */

/**
 * @typedef {object} SyncSessionStartedEvent
 * @property {'sync.session.started'} type
 */

/**
 * @typedef {object} SyncSessionContextResolvedEvent
 * @property {'sync.session.context-resolved'} type
 * @property {SyncSessionContext} context
 */

/**
 * @typedef {object} SyncSessionApplyProgressMeasurement
 * @property {number} current
 * @property {number} total
 * @property {'bytes'} unit
 */

/**
 * @typedef {object} SyncSessionApplyProgress
 * @property {'start' | 'copy' | 'delete' | 'cleanup' | 'complete'} activity
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
 * @property {SyncSessionDependents} [dependents]
 */

/**
 * @typedef {object} SyncSessionProgressEvent
 * @property {'sync.session.progress'} type
 * @property {string} phase
 * @property {string} message
 * @property {SyncSessionApplyProgress} [progress]
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
 * @property {string | null} [phase]
 * @property {{ added: number, modified: number, deleted: number }} [summary]
 * @property {Array<object>} [operations]
 */

/**
 * @typedef {object} SyncExecutionFailedResult
 * @property {'failed'} result
 * @property {string} message
 * @property {string | null} phase
 * @property {unknown} error
 * @property {Array<object>} [operations]
 */

/**
 * @typedef {SyncExecutionCompletedResult | SyncExecutionCancelledResult | SyncExecutionFailedResult} SyncExecutionResult
 */

/**
 * @typedef {SyncExecutionCompletedResult & { context: SyncSessionContext }} SyncSessionCompletedResult
 */

/**
 * @typedef {SyncExecutionCancelledResult & { context: SyncSessionContext }} SyncSessionCancelledResult
 */

/**
 * @typedef {object} SyncSessionFailedResult
 * @property {'failed'} result
 * @property {string} message
 * @property {string} [errorCode]
 * @property {object} [errorDetails]
 * @property {string} [logPath]
 * @property {SyncSessionContext | null} context
 * @property {unknown} error
 */

/**
 * @typedef {SyncSessionCompletedResult | SyncSessionCancelledResult | SyncSessionFailedResult} SyncSessionResult
 */

/**
 * @typedef {object} SyncSessionResultEvent
 * @property {'sync.session.result'} type
 * @property {'completed' | 'cancelled' | 'failed'} result
 * @property {SyncSessionContext | null} context
 */

/**
 * @typedef {
 *   SyncSessionStartedEvent |
 *   SyncSessionContextResolvedEvent |
 *   SyncSessionProgressEvent |
 *   SyncSessionResultEvent
 * } SyncSessionEvent
 */
