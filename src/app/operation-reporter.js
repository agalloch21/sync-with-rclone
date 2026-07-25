import {
  createOperationErrorReportState,
  OPERATION_REPORT_ACKNOWLEDGEMENT,
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from './operation-report-contract.js'

export const APP_OPERATION = Object.freeze({
  CREATE_SERVER: 'createServer',
})

export const SERVER_CREATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'save',
  TEST_CONNECTION: 'testConnection',
  ROLLBACK: 'rollback',
})

export const OPERATION_PROGRESS_STEPS = Object.freeze({
  [APP_OPERATION.CREATE_SERVER]: SERVER_CREATE_PROGRESS_STEP,
})

function assertReporterDependencies(display) {
  if (!display || typeof display !== 'object')
    throw new TypeError('Operation reporter requires a display interface.')

  for (const method of ['open', 'update', 'close']) {
    if (typeof display[method] !== 'function')
      throw new TypeError(`Operation reporter requires ${method}().`)
  }
}

export function createOperationReporter(operation, display) {
  if (typeof operation !== 'string' || operation.trim().length === 0)
    throw new TypeError('Operation must be a non-empty string.')

  assertReporterDependencies(display)
  const {
    open,
    update,
    close,
  } = display
  const operationKey = `operations.${operation}`
  const acknowledgement = Promise.resolve(open({
    mode: OPERATION_REPORT_MODE.PROGRESS,
    key: operationKey,
  }))
  acknowledgement.catch(() => {})

  function step(code, params = {}) {
    update({
      mode: OPERATION_REPORT_MODE.PROGRESS,
      key: `${operationKey}.steps.${code}`,
      params,
    })
  }

  async function succeed(needAcknowledgement = false) {
    if (needAcknowledgement) {
      update({
        mode: OPERATION_REPORT_MODE.MESSAGE,
        level: OPERATION_REPORT_LEVEL.SUCCESS,
        key: `${operationKey}.succeeded`,
      })
    }
    else {
      close(OPERATION_REPORT_ACKNOWLEDGEMENT.CONFIRMED)
    }

    await acknowledgement
  }

  async function reportError(error) {
    update(createOperationErrorReportState(error))
    await acknowledgement
  }

  async function finish(acknowledgement = OPERATION_REPORT_ACKNOWLEDGEMENT.CLOSED) {
    close(acknowledgement)
    await acknowledgement
  }

  return {
    step,
    succeed,
    error: reportError,
    close: finish,
  }
}
