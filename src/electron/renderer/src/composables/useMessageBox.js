export function useMessageBox(windowPreload) {
  function showMessageBox(options = {}) {
    return windowPreload?.showMessageBox?.(options)
  }

  function closeMessageBox(action = 'close') {
    return windowPreload?.closeMessageBox?.(action)
  }

  function showProgressMessage({
    title = 'Working',
    message = 'Please wait...',
    detail = '',
  } = {}) {
    const promise = showMessageBox({
      mode: 'progress',
      title,
      message,
      detail,
      closeOnAction: false,
    })
    promise?.catch?.(() => {})
    return promise
  }

  function showErrorMessage({
    title = 'Error',
    message = 'Something went wrong.',
    detail = '',
    okLabel = 'OK',
  } = {}) {
    return showMessageBox({
      mode: 'error',
      title,
      message,
      detail,
      okLabel,
    })
  }

  function showWarningMessage({
    title = 'Warning',
    message = 'Check your selection.',
    detail = '',
    okLabel = 'OK',
  } = {}) {
    return showMessageBox({
      mode: 'warning',
      title,
      message,
      detail,
      okLabel,
    })
  }

  return {
    showProgressMessage,
    showErrorMessage,
    showWarningMessage,
    closeMessageBox,
  }
}
