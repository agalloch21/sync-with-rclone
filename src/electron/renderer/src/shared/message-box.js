export function showMessageBox(options = {}) {
  const surface = window.mainWindow || window.syncTaskModal
  return surface?.showMessageBox?.(options)
}

export function closeMessageBox(action = 'close') {
  const surface = window.mainWindow || window.syncTaskModal
  return surface?.closeMessageBox?.(action)
}

export function showProgressMessage({
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

export function showErrorMessage({
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

export function showWarningMessage({
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
