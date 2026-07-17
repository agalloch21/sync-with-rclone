import { MESSAGE_BOX_LEVEL, MESSAGE_BOX_MODE, MESSAGE_BOX_RESULT } from '#src/app/main-window/message-box-contract.js'

export function useMessageBox(windowPreload) {
  function showMessageBox(payload = {}) {
    return windowPreload?.showMessageBox?.(payload)
  }

  function closeMessageBox(payload = { result: MESSAGE_BOX_RESULT.CLOSED }) {
    return windowPreload?.closeMessageBox?.(payload)
  }

  function showProgressMessage({
    title = 'Working',
    message = 'Please wait...',
    detail = '',
  } = {}) {
    const promise = showMessageBox({
      mode: MESSAGE_BOX_MODE.PROGRESS,
      level: MESSAGE_BOX_LEVEL.INFO,
      title,
      message,
      detail,
    })
    promise?.catch?.(() => {})
    return promise
  }

  function showErrorMessage({
    title = 'Error',
    message = 'Something went wrong.',
    detail = '',
  } = {}) {
    return showMessageBox({
      mode: MESSAGE_BOX_MODE.MESSAGE,
      level: MESSAGE_BOX_LEVEL.ERROR,
      title,
      message,
      detail,
    })
  }

  function showWarningMessage({
    title = 'Warning',
    message = 'Check your selection.',
    detail = '',
  } = {}) {
    return showMessageBox({
      mode: MESSAGE_BOX_MODE.MESSAGE,
      level: MESSAGE_BOX_LEVEL.WARNING,
      title,
      message,
      detail,
    })
  }

  function showConfirmMessage({
    title = 'Confirm',
    message = 'Are you sure?',
    detail = '',
    level = MESSAGE_BOX_LEVEL.WARNING,
  } = {}) {
    return showMessageBox({
      mode: MESSAGE_BOX_MODE.CONFIRM,
      level,
      title,
      message,
      detail,
    })
  }

  return {
    showProgressMessage,
    showErrorMessage,
    showWarningMessage,
    showConfirmMessage,
    closeMessageBox,
  }
}
