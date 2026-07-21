import assert from 'node:assert/strict'
import test from 'node:test'
import { reportOperationProgress, runWithOperationProgress } from '#src/app/operation-progress.js'

test('operation progress publishes structured events and preserves the callback result', async () => {
  const events = []
  const result = await runWithOperationProgress({
    operationId: 'operation-1',
    operation: 'example.operation',
    publish: event => events.push(event),
  }, async () => {
    await Promise.resolve()
    reportOperationProgress({ step: 'example.step', status: 'started' })
    return 'done'
  })

  assert.equal(result, 'done')
  assert.deepEqual(events, [{
    operationId: 'operation-1',
    operation: 'example.operation',
    step: 'example.step',
    status: 'started',
  }])
})

test('operation progress is a no-op outside an active context', () => {
  assert.doesNotThrow(() => {
    reportOperationProgress({ step: 'example.step', status: 'started' })
  })
})

test('operation progress keeps concurrent async contexts isolated', async () => {
  const events = []

  await Promise.all(['first', 'second'].map(operationId => runWithOperationProgress({
    operationId,
    operation: 'example.operation',
    publish: event => events.push(event),
  }, async () => {
    await Promise.resolve()
    reportOperationProgress({ step: operationId, status: 'started' })
  })))

  assert.deepEqual(events.map(event => [event.operationId, event.step]).sort(), [
    ['first', 'first'],
    ['second', 'second'],
  ])
})

test('operation progress preserves thrown errors', async () => {
  const expectedError = new Error('failed')

  await assert.rejects(
    () => runWithOperationProgress({
      operationId: 'operation-1',
      operation: 'example.operation',
      publish() {},
    }, async () => {
      throw expectedError
    }),
    error => error === expectedError,
  )
})
