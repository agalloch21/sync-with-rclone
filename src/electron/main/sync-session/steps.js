import { SYNC_PHASES } from '#src/app/sync-session/contract.js'

export const STEPS = {
  ANALYZE: 'analyze',
  REVIEW: 'review',
  SYNC: 'sync',
}
export const STEP_META = {
  [STEPS.ANALYZE]: {
    index: 1,
    keyPrefix: `step.${STEPS.ANALYZE}.`,
    phases: [SYNC_PHASES.PREPARATION, SYNC_PHASES.BUILD_LOCAL_SNAPSHOT, SYNC_PHASES.BUILD_REMOTE_SNAPSHOT, SYNC_PHASES.COMPARE_SNAPSHOT],
  },
  [STEPS.REVIEW]: {
    index: 2,
    keyPrefix: `step.${STEPS.REVIEW}.`,
    phases: [SYNC_PHASES.REVIEW_DIFFERENCES],
  },
  [STEPS.SYNC]: {
    index: 3,
    keyPrefix: `step.${STEPS.SYNC}.`,
    phases: [SYNC_PHASES.GENERATE_PLAN, SYNC_PHASES.APPLY_PLAN],
  },
}

export function getStepForPhase(phase) {
  const stepEntry = Object.entries(STEP_META).find(([_key, value]) => value.phases.includes(phase))

  return stepEntry ? stepEntry[0] : undefined
}
