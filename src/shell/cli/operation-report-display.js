import {
  normalizeOperationReportState,
  OPERATION_REPORT_ACKNOWLEDGEMENT,
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/contracts/operation-report.js'
import { createCliI18n } from './i18n.js'

function translateIfPresent(i18n, key, params) {
  return i18n.te(key) ? i18n.t(key, params) : ''
}

function resolveMessage(state, i18n) {
  if (state.text)
    return state.text.message

  const params = state.params || {}
  const messageKey = i18n.te(`${state.key}.message`)
    ? `${state.key}.message`
    : state.key

  return translateIfPresent(i18n, messageKey, params)
    || state.detail
    || (state.mode === OPERATION_REPORT_MODE.PROGRESS ? 'Working...' : 'Operation failed.')
}

export function createCliOperationReportDisplay({
  output = console,
  i18n = createCliI18n(),
} = {}) {
  function displayMessage(payload) {
    const state = normalizeOperationReportState(payload)
    const message = resolveMessage(state, i18n)
    const write = state.level === OPERATION_REPORT_LEVEL.ERROR
      ? output.error.bind(output)
      : output.log.bind(output)

    write(message)
    if (state.detail && state.detail !== message)
      write(state.detail)
  }

  function open(payload) {
    displayMessage(payload)
    return Promise.resolve(OPERATION_REPORT_ACKNOWLEDGEMENT.CONFIRMED)
  }

  function update(payload) {
    displayMessage(payload)
  }

  function close() {}

  return {
    open,
    update,
    close,
  }
}
