export function createReporter(emit = () => {}) {
  return {
    started(phase, message) {
      emit({ type: 'phase', phase, status: 'started', message: message || `phase [${phase}] started` })
    },
    done(phase, message) {
      emit({ type: 'phase', phase, status: 'done', message: message || `phase [${phase}] completed` })
    },
    progress(phase, current, total, message) {
      emit({ type: 'phase', phase, status: 'running', current, total, message: message || `phase [${phase}] is running` })
    },
    error(phase, error) {
      emit({ type: 'phase', phase, status: 'failed', message: error?.message || `phase [${phase}] failed` })
    },
    cancelled(phase, message) {
      emit({ type: 'phase', phase, status: 'cancelled', message: message || `phase [${phase}] cancelled` })
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
