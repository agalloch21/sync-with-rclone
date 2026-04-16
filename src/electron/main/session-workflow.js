import { PHASES } from '#src/core/phases.js'

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
    phases: [PHASES.GENERATE_PLAN, PHASES.GENERATE_PLAN],
  },
}

// export const PHASE_META = {
//   [PHASES.PREPARATION]: {
//     step: STEPS.ANALYZE,
//     order: 1,
//   },
//   [PHASES.BUILD_LOCAL_SNAPSHOT]: {
//     step: STEPS.ANALYZE,
//     order: 2,
//   },
//   [PHASES.BUILD_REMOTE_SNAPSHOT]: {
//     step: STEPS.ANALYZE,
//     order: 3,
//   },
//   [PHASES.COMPARE_SNAPSHOT]: {
//     step: STEPS.ANALYZE,
//     order: 4,
//   },
//   [PHASES.REVIEW_DIFFERENCES]: {
//     step: STEPS.REVIEW,
//     order: 1,
//   },
//   [PHASES.GENERATE_PLAN]: {
//     step: STEPS.SYNC,
//     order: 1,
//   },
//   [PHASES.APPLY_PLAN]: {
//     step: STEPS.SYNC,
//     order: 2,
//   },
// }

export function getStepForPhase(phase) {
  const stepEntry = Object.entries(STEP_META).find(([_key, value]) => value.phases.includes(phase))

  return stepEntry ? stepEntry[0] : undefined
}
