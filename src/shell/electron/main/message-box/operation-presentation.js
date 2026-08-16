import { createOperationErrorReportState } from '#src/app/contracts/operation-report.js'
import { toFailureResult, toSuccessfulResult } from '#src/app/operation-result.js'
import { createOperationReporter } from '#src/app/operations/operation-reporter.js'
import { closeMessageBox, openMessageBox, updateMessageBox } from './window.js'

export async function runReportedOperation(operation, execute) {
  const reporter = createOperationReporter(operation, {
    open: openMessageBox,
    update: updateMessageBox,
    close: closeMessageBox,
  })

  let value
  try {
    value = await execute(reporter.step)
  }
  catch (error) {
    await reporter.error(error)
    return toFailureResult(error)
  }

  await reporter.succeed(true)
  return toSuccessfulResult(value)
}

export async function reportRequestError(error) {
  await openMessageBox(createOperationErrorReportState(error))
  return toFailureResult(error)
}
