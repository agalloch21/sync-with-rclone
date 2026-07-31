import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FORM_MODAL_VIEW,
  isValidFormModalView,
} from '#electron/contracts/form-modal.js'

test('isValidFormModalView accepts supported form views only', () => {
  assert.equal(isValidFormModalView(FORM_MODAL_VIEW.CHOOSE_SERVER), true)
  assert.equal(isValidFormModalView(FORM_MODAL_VIEW.CREATE_SERVER), true)
  assert.equal(isValidFormModalView(FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING), true)
  assert.equal(isValidFormModalView(FORM_MODAL_VIEW.EDIT_SERVER), true)
  assert.equal(isValidFormModalView(FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING), true)
  assert.equal(isValidFormModalView(FORM_MODAL_VIEW.EDIT_PATTERNS), true)
  assert.equal(isValidFormModalView('confirmDeleteServer'), false)
  assert.equal(isValidFormModalView('confirmDeleteTask'), false)
  assert.equal(isValidFormModalView('sync'), false)
  assert.equal(isValidFormModalView(''), false)
})
