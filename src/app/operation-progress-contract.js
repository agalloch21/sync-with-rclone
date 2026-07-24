export const APP_OPERATION = Object.freeze({
  CREATE_SERVER: 'createServer',
})

export const SERVER_CREATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'save',
  TEST_CONNECTION: 'testConnection',
  ROLLBACK: 'rollback',
})

export const OPERATION_PROGRESS_STEPS = Object.freeze({
  [APP_OPERATION.CREATE_SERVER]: SERVER_CREATE_PROGRESS_STEP,
})
