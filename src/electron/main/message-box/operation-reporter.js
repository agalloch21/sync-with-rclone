import {
  createMessageBoxErrorState,
  MESSAGE_BOX_LEVEL,
  MESSAGE_BOX_MODE,
  MESSAGE_BOX_RESULT,
} from '#src/app/main-window/message-box-contract.js'
import { closeMessageBox, openMessageBox, updateMessageBox } from './window.js'

export function createOperationReporter(operation) {
  const operationKey = `operations.${operation}`
  const acknowledgement = openMessageBox({
    mode: MESSAGE_BOX_MODE.PROGRESS,
    key: operationKey,
  })
  acknowledgement.catch(() => {})

  function step(code, params = {}) {
    updateMessageBox({
      mode: MESSAGE_BOX_MODE.PROGRESS,
      key: `${operationKey}.steps.${code}`,
      params,
    })
  }

  async function succeed(needAcknowledgement = false) {
    if (needAcknowledgement) {
      updateMessageBox({
        mode: MESSAGE_BOX_MODE.MESSAGE,
        level: MESSAGE_BOX_LEVEL.SUCCESS,
        key: `${operationKey}.succeeded`,
      })
    }
    else {
      closeMessageBox(MESSAGE_BOX_RESULT.CONFIRMED)
    }

    await acknowledgement
  }

  async function error(errorLike) {
    updateMessageBox(createMessageBoxErrorState(errorLike))
    await acknowledgement
  }

  async function close(result = MESSAGE_BOX_RESULT.CLOSED) {
    closeMessageBox(result)
    await acknowledgement
  }

  return {
    step,
    succeed,
    error,
    close,
  }
}
