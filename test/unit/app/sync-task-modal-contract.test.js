import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidSyncTaskModal,
  SYNC_TASK_MODALS,
} from '#src/app/main-window/modal-contract.js'

test('isValidSyncTaskModal accepts supported sync-task modal entries only', () => {
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.CHOOSE_SERVER), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.CREATE_SERVER), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.EDIT_SERVER), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.EDIT_PATTERNS), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER), true)
  assert.equal(isValidSyncTaskModal(SYNC_TASK_MODALS.CONFIRM_DELETE_TASK), true)
  assert.equal(isValidSyncTaskModal('sync'), false)
  assert.equal(isValidSyncTaskModal(''), false)
})
