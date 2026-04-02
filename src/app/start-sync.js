import { syncCore } from '#src/core/sync-engine.js'

/**
 * Application-layer orchestration entry.
 * Shells provide options and a review implementation.
 *
 * @param {import('#src/core/sync-engine.js').Options} options
 * @param {{ reviewDiff?: (diffSnapshot: import('#src/types/snapshot.js').DiffSnapshot, context: unknown) => Promise<import('#src/app/review-contracts.js').ReviewResult | unknown> }} [hooks]
 */
export async function startSync(options, hooks = {}) {
  return await syncCore(options, hooks)
}

