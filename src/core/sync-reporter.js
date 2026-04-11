export function createReporter(emit = () => {}) {
  return {
    started(phase, message) {
      emit({ type: 'phase', phase, status: 'started', message })
    },
    done(phase, data) {
      emit({ type: 'phase', phase, status: 'doen', data })
    },
    progress(phase, current, total, message) {
      emit({ type: 'status', phase, status: 'running', current, total, message })
    },
    error(phase, error) {
      emit({ type: 'status', phase, status: 'failed', message: error.message })
    },
  }
}

export async function runWithReporter(reporter, phase, fn, message) {
  reporter.started(phase, message)

  try {
    const result = await fn()
    reporter.done(phase)
    return result
  }
  catch (error) {
    reporter.error(phase, error)
    throw error
  }
}
