import { PHASES } from '#src/core/phases.js'

export const SESSION_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ERROR: 'error',
}

export const STEPS = {
  ANALYZE: 'analyze',
  REVIEW: 'review',
  SYNC: 'sync',
}
export const STEP_META = {
  [STEPS.ANALYZE]: {
    index: 1,
    keyPrefix: `step.${STEPS.ANALYZE}.`,
    phases: [PHASES.PREPARATION, PHASES.BUILD_LOCAL_SNAPSHOT, PHASES.BUILD_REMOTE_SNAPSHOT, PHASES.COMPARE_SNAPSHOT],
  },
  [STEPS.REVIEW]: {
    index: 2,
    keyPrefix: `step.${STEPS.REVIEW}.`,
    phases: [PHASES.REVIEW_DIFFERENCES],
  },
  [STEPS.SYNC]: {
    index: 3,
    keyPrefix: `step.${STEPS.SYNC}.`,
    phases: [PHASES.GENERATE_PLAN, PHASES.APPLY_PLAN],
  },
}

export function getStepForPhase(phase) {
  const stepEntry = Object.entries(STEP_META).find(([_key, value]) => value.phases.includes(phase))

  return stepEntry ? stepEntry[0] : undefined
}
