export const SESSION_EVENT = {
  STARTED: 'session.started',
  CONTEXT_RESOLVED: 'session.context-resolved',
  PROGRESS: 'session.progress',
  RESULT: 'session.result',
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
 * @typedef {object} SyncSessionEventRuntime
 * @property {(event: SyncSessionEvent) => void} [eventListener]
 */

/**
 * @typedef {object} SyncSessionInteractions
 * @property {(diffSnapshot: import('#src/core/snapshot.js').DiffSnapshot) => Promise<import('./review-contracts.js').ReviewResult>} [reviewDiff]
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
 * @typedef {object} SessionStartedEvent
 * @property {'session.started'} type
 */

/**
 * @typedef {object} SessionContextResolvedEvent
 * @property {'session.context-resolved'} type
 * @property {SyncSessionContext} context
 */

/**
 * @typedef {object} SessionApplyProgressMeasurement
 * @property {number} current
 * @property {number} total
 * @property {'bytes'} unit
 */

/**
 * @typedef {object} SessionApplyProgress
 * @property {'start' | 'copy' | 'delete' | 'cleanup' | 'complete'} activity
 * @property {number} index
 * @property {number} total
 * @property {SessionApplyProgressMeasurement | null} measurement
 */

/**
 * @typedef {object} CorePhaseSessionEvent
 * @property {'core.phase'} type
 * @property {string} phase
 * @property {'started' | 'running' | 'done'} status
 * @property {string} message
 * @property {SessionApplyProgress | null} progress
 */

/**
 * @typedef {object} SessionCompletedEvent
 * @property {'session.completed'} type
 * @property {import('#src/core/contract.js').SyncCoreCompletedResult} result
 */

/**
 * @typedef {object} SessionCancelledEvent
 * @property {'session.cancelled'} type
 * @property {import('#src/core/contract.js').SyncCoreCancelledResult} result
 */

/**
 * @typedef {object} SessionFailedEvent
 * @property {'session.failed'} type
 * @property {string} message
 * @property {string} [errorCode]
 * @property {object} [errorDetails]
 * @property {unknown} [error]
 */

/**
 * @typedef {
 *   SessionStartedEvent |
 *   SessionContextResolvedEvent |
 *   CorePhaseSessionEvent |
 *   SessionCompletedEvent |
 *   SessionCancelledEvent |
 *   SessionFailedEvent
 * } SyncSessionEvent
 */

/**
 * @typedef {import('#src/core/contract.js').SyncCoreCompletedResult & { context: SyncSessionContext }} SyncSessionCompletedResult
 */

/**
 * @typedef {import('#src/core/contract.js').SyncCoreCancelledResult & { context: SyncSessionContext }} SyncSessionCancelledResult
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
