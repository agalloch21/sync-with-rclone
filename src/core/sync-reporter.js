import { PHASE_EVENT } from './contract.js'

export function createReporter(emit = () => {}) {
  return {
    started(phase, message) {
      emit({ type: PHASE_EVENT.STARTED, phase, message: message || `phase [${phase}] started` })
    },
    done(phase, message) {
      emit({ type: PHASE_EVENT.DONE, phase, message: message || `phase [${phase}] completed` })
    },
    progress(phase, current, total, message) {
      emit({ type: PHASE_EVENT.PROGRESS, phase, current, total, message: message || `phase [${phase}] is running` })
    },
    error(phase, error) {
      emit({ type: PHASE_EVENT.FAILED, phase, message: error?.message || `phase [${phase}] failed` })
    },
    cancelled(phase, message) {
      emit({ type: PHASE_EVENT.CANCELLED, phase, message: message || `phase [${phase}] cancelled` })
    },
  }
}

export async function runWithReporter(reporter, phase, fn, message, cancelSignal = null) {
  reporter.started(phase, message)

  try {
    const result = await fn()

    reporter.done(phase)

    cancelSignal?.throwIfAborted()

    return result
  }
  catch (error) {
    if (cancelSignal?.aborted || error === cancelSignal?.reason) {
      reporter.cancelled(phase)
    }
    else {
      reporter.error(phase, error)
    }
    throw error
  }
}
