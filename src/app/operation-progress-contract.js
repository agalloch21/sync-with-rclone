export const OPERATION_PROGRESS_STATUS = Object.freeze({
  STARTED: 'started',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
})

export const APP_OPERATION = Object.freeze({
  CREATE_SERVER: 'server.create',
})

export const SERVER_CREATE_PROGRESS_STEP = Object.freeze({
  SAVE: 'server.save',
  TEST_CONNECTION: 'server.testConnection',
  ROLLBACK: 'server.rollback',
})
