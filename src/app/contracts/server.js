export const SERVER_OPERATION = Object.freeze({
  CREATE: 'createServer',
  UPDATE: 'updateServer',
  DELETE: 'deleteServer',
})

export const SERVER_CREATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'save',
  TEST_CONNECTION: 'testConnection',
  ROLLBACK: 'rollback',
})

export const SERVER_UPDATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'save',
  ROLLBACK: 'rollback',
})

export const SERVER_DELETE_PROGRESS_STEP = Object.freeze({
  DELETE: 'delete',
})

export const SERVER_OPERATION_PROGRESS_STEPS = Object.freeze({
  [SERVER_OPERATION.CREATE]: SERVER_CREATE_PROGRESS_STEP,
  [SERVER_OPERATION.UPDATE]: SERVER_UPDATE_PROGRESS_STEP,
  [SERVER_OPERATION.DELETE]: SERVER_DELETE_PROGRESS_STEP,
})
