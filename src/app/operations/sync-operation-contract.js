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
 * @property {'push' | 'pull'} mode
 * @property {string} localFolderPath
 * @property {string} [remoteFolderPath]
 * @property {boolean} [bypassConfig]
 */

/**
 * @typedef {import('#src/core/contract.js').SyncSessionContext} SyncSessionContext
 */

/**
 * @typedef {object} SyncSessionEventRuntime
 * @property {(event: SyncSessionEvent) => void} [eventListener]
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
 * @typedef {object} SyncSessionProgressEvent
 * @property {'sync.session.progress'} type
 * @property {string} phase
 * @property {string} message
 * @property {import('#src/core/contract.js').SyncSessionApplyProgress} [progress]
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
