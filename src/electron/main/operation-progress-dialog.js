import { randomUUID } from 'node:crypto'
import { AppError } from '#src/app/app-errors.js'
import { MESSAGE_BOX_LEVEL, MESSAGE_BOX_MODE, MESSAGE_BOX_RESULT } from '#src/app/main-window/message-box-contract.js'
import { runWithOperationProgress } from '#src/app/operation-progress.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'

function formatErrorDetail(error) {
  const fieldDetail = Object.values(error?.fields || {})
    .filter(Boolean)
    .join('\n')

  return fieldDetail || error?.detail || ''
}

export function createOperationProgressDialogController({
  openMessageBox,
  updateMessageBox,
  closeMessageBox,
  createOperationId = randomUUID,
}) {
  if (typeof openMessageBox !== 'function' || typeof updateMessageBox !== 'function' || typeof closeMessageBox !== 'function')
    throw new TypeError('Operation progress dialog controller requires message-box functions.')

  return async function runProgressOperation({ operation, execute }) {
    const operationId = createOperationId()
    const acknowledgement = openMessageBox({
      mode: MESSAGE_BOX_MODE.PROGRESS,
      level: MESSAGE_BOX_LEVEL.INFO,
      title: 'Working',
      titleKey: 'operationProgress.createServer.title',
      message: 'Preparing the operation...',
      messageKey: 'operationProgress.common.preparing',
      progress: null,
    })
    acknowledgement.catch(() => {})

    try {
      const value = await runWithOperationProgress({
        operationId,
        operation,
        publish: progress => updateMessageBox({ progress }),
      }, execute)

      closeMessageBox(MESSAGE_BOX_RESULT.CONFIRMED)
      await acknowledgement
      return value === undefined ? toSuccessfulResult() : toSuccessfulResult(value)
    }
    catch (error) {
      const result = toFailureResult(error)
      updateMessageBox({
        mode: MESSAGE_BOX_MODE.MESSAGE,
        level: error instanceof AppError ? MESSAGE_BOX_LEVEL.WARNING : MESSAGE_BOX_LEVEL.ERROR,
        title: error instanceof AppError ? 'Operation Failed' : 'Error',
        titleKey: error instanceof AppError
          ? 'operationProgress.common.failedTitle'
          : 'operationProgress.common.errorTitle',
        message: result.error.message,
        messageKey: '',
        detail: formatErrorDetail(error),
        progress: null,
      })
      await acknowledgement
      return result
    }
  }
}
