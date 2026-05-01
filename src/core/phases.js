export const PHASES = {
  PREPARATION: 'preparation',
  BUILD_LOCAL_SNAPSHOT: 'build-local-snapshot',
  BUILD_REMOTE_SNAPSHOT: 'build-remote-snapshot',
  COMPARE_SNAPSHOT: 'compare-snapshot',
  REVIEW_DIFFERENCES: 'review-differences',
  GENERATE_PLAN: 'generate-plan',
  APPLY_PLAN: 'apply-plan',
}

export const PHASE_STATUS = {
  STARTED: 'started',
  DONE: 'done',
  RUNNING: 'running',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

export function isFirstPhase(phase) {
  return phase === PHASES.PREPARATION
}

export function isLastPhase(phase) {
  return phase === PHASES.APPLY_PLAN
}
