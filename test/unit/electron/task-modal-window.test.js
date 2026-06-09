import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getTaskModalTitle,
  isValidTaskModalAction,
  TASK_MODAL_ACTIONS,
} from '#src/electron/main/task-modal-window.js'

test('isValidTaskModalAction accepts supported main-panel actions only', () => {
  assert.equal(isValidTaskModalAction(TASK_MODAL_ACTIONS.CREATE), true)
  assert.equal(isValidTaskModalAction(TASK_MODAL_ACTIONS.EDIT), true)
  assert.equal(isValidTaskModalAction(TASK_MODAL_ACTIONS.DELETE), true)
  assert.equal(isValidTaskModalAction(TASK_MODAL_ACTIONS.PATTERNS), true)
  assert.equal(isValidTaskModalAction('sync'), false)
  assert.equal(isValidTaskModalAction(''), false)
})

test('getTaskModalTitle returns placeholder modal titles', () => {
  assert.equal(getTaskModalTitle(TASK_MODAL_ACTIONS.CREATE), 'Create Task')
  assert.equal(getTaskModalTitle(TASK_MODAL_ACTIONS.EDIT), 'Edit Task')
  assert.equal(getTaskModalTitle(TASK_MODAL_ACTIONS.DELETE), 'Delete Task')
  assert.equal(getTaskModalTitle(TASK_MODAL_ACTIONS.PATTERNS), 'Patterns')
})
