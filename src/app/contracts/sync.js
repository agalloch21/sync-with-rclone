export {
  SYNC_CANCEL_REASON,
  SYNC_PHASE_EVENT,
  SYNC_PHASES,
  SYNC_RESULT,
  SYNC_REVIEW_ACTION,
} from '#src/core/contract.js'

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
 * @property {'push' | 'pull'} mode - Synchronization direction.
 * @property {string} localFolderPath - Requested local directory.
 * @property {string} [remoteFolderPath] - Optional explicit remote directory.
 * @property {boolean} [bypassConfig] - Whether to bypass configured sync tasks.
 */

/**
 * @typedef {import('#src/core/contract.js').SyncSessionContext} SyncSessionContext
 */

/**
 * @typedef {object} SyncSessionEventRuntime
 * @property {(event: SyncSessionEvent) => void} [eventListener] - Receives session lifecycle events.
 */

/**
 * @typedef {object} SyncSessionStartedEvent
 * @property {'sync.session.started'} type - Started event discriminator.
 */

/**
 * @typedef {object} SyncSessionContextResolvedEvent
 * @property {'sync.session.context-resolved'} type - Context-resolved event discriminator.
 * @property {SyncSessionContext} context - Resolved synchronization context.
 */

/**
 * @typedef {object} SyncSessionProgressEvent
 * @property {'sync.session.progress'} type - Progress event discriminator.
 * @property {string} phase - Active synchronization phase.
 * @property {string} message - Current progress message.
 * @property {import('#src/core/contract.js').SyncSessionApplyProgress} [progress] - Optional apply progress.
 */

/**
 * @typedef {object} SyncSessionResultEvent
 * @property {'sync.session.result'} type - Result event discriminator.
 * @property {'completed' | 'cancelled' | 'failed'} result - Terminal session result.
 * @property {SyncSessionContext | null} context - Resolved context when available.
 */

/**
 * @typedef {
 *   SyncSessionStartedEvent |
 *   SyncSessionContextResolvedEvent |
 *   SyncSessionProgressEvent |
 *   SyncSessionResultEvent
 * } SyncSessionEvent
 */
