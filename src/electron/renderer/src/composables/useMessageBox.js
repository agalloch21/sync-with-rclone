import {
  createOperationErrorReportState,
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/operations/operation-report-contract.js'

export function useMessageBox(windowPreload) {
  function showMessageBox(payload = {}) {
    return windowPreload?.showMessageBox?.(payload)
  }

  function notify(level, code, options = {}) {
    return showMessageBox({
      mode: OPERATION_REPORT_MODE.MESSAGE,
      level,
      key: `messages.${code}`,
      ...(options.params !== undefined && { params: options.params }),
      ...(options.detail !== undefined && { detail: options.detail }),
    })
  }

  function information(code, options) {
    return notify(OPERATION_REPORT_LEVEL.INFO, code, options)
  }

  function warning(code, options) {
    return notify(OPERATION_REPORT_LEVEL.WARNING, code, options)
  }

  function success(code, options) {
    return notify(OPERATION_REPORT_LEVEL.SUCCESS, code, options)
  }

  function confirm(code, options = {}) {
    return showMessageBox({
      mode: OPERATION_REPORT_MODE.CONFIRM,
      key: `messages.${code}`,
      ...(options.params !== undefined && { params: options.params }),
      ...(options.detail !== undefined && { detail: options.detail }),
    })
  }

  function error(errorLike = {}) {
    return showMessageBox(createOperationErrorReportState(errorLike))
  }

  return {
    information,
    warning,
    success,
    confirm,
    error,
  }
}
