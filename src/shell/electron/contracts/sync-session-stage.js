import { SYNC_PHASES } from '#src/core/contract.js'

export const SYNC_SESSION_STAGE = {
  ANALYZE: 'analyze',
  REVIEW: 'review',
  SYNC: 'sync',
}
export const SYNC_SESSION_STAGE_META = {
  [SYNC_SESSION_STAGE.ANALYZE]: {
    index: 1,
    phases: [SYNC_PHASES.PREPARATION, SYNC_PHASES.BUILD_LOCAL_SNAPSHOT, SYNC_PHASES.BUILD_REMOTE_SNAPSHOT, SYNC_PHASES.COMPARE_SNAPSHOT],
  },
  [SYNC_SESSION_STAGE.REVIEW]: {
    index: 2,
    phases: [SYNC_PHASES.REVIEW_DIFFERENCES],
  },
  [SYNC_SESSION_STAGE.SYNC]: {
    index: 3,
    phases: [SYNC_PHASES.GENERATE_PLAN, SYNC_PHASES.APPLY_PLAN],
  },
}

export function getSyncSessionStageForPhase(phase) {
  const stageEntry = Object.entries(SYNC_SESSION_STAGE_META).find(([_key, value]) => value.phases.includes(phase))

  return stageEntry ? stageEntry[0] : undefined
}
