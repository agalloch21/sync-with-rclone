import {
  createMessageBoxErrorState,
  MESSAGE_BOX_LEVEL,
  MESSAGE_BOX_MODE,
} from '#src/app/main-window/message-box-contract.js'

export function useMessageBox(windowPreload) {
  function showMessageBox(payload = {}) {
    return windowPreload?.showMessageBox?.(payload)
  }

  function notify(level, code, options = {}) {
    return showMessageBox({
      mode: MESSAGE_BOX_MODE.MESSAGE,
      level,
      key: `messages.${code}`,
      ...(options.params !== undefined && { params: options.params }),
      ...(options.detail !== undefined && { detail: options.detail }),
    })
  }

  function information(code, options) {
    return notify(MESSAGE_BOX_LEVEL.INFO, code, options)
  }

  function warning(code, options) {
    return notify(MESSAGE_BOX_LEVEL.WARNING, code, options)
  }

  function success(code, options) {
    return notify(MESSAGE_BOX_LEVEL.SUCCESS, code, options)
  }

  function confirm(code, options = {}) {
    return showMessageBox({
      mode: MESSAGE_BOX_MODE.CONFIRM,
      key: `messages.${code}`,
      ...(options.params !== undefined && { params: options.params }),
      ...(options.detail !== undefined && { detail: options.detail }),
    })
  }

  function error(errorLike = {}) {
    return showMessageBox(createMessageBoxErrorState(errorLike))
  }

  return {
    information,
    warning,
    success,
    confirm,
    error,
  }
}
