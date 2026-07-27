export const SERVER_OPERATION = Object.freeze({
  TEST: 'testServerConnection',
  CREATE: 'createServer',
  UPDATE: 'updateServer',
  DELETE: 'deleteServer',
})

export const SERVER_TEST_PROGRESS_STEP = Object.freeze({
  TEST_CONNECTION: 'testConnection',
})

export const SERVER_CREATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'save',
  TEST_CONNECTION: 'testConnection',
  ROLLBACK: 'rollback',
})

export const SERVER_UPDATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'save',
})

export const SERVER_DELETE_PROGRESS_STEP = Object.freeze({
  DELETE: 'delete',
})

export const SERVER_OPERATION_PROGRESS_STEPS = Object.freeze({
  [SERVER_OPERATION.TEST]: SERVER_TEST_PROGRESS_STEP,
  [SERVER_OPERATION.CREATE]: SERVER_CREATE_PROGRESS_STEP,
  [SERVER_OPERATION.UPDATE]: SERVER_UPDATE_PROGRESS_STEP,
  [SERVER_OPERATION.DELETE]: SERVER_DELETE_PROGRESS_STEP,
})
