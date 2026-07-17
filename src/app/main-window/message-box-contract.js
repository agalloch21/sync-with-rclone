export const MESSAGE_BOX_MODE = Object.freeze({
  MESSAGE: 'message',
  CONFIRM: 'confirm',
  PROGRESS: 'progress',
})

export const MESSAGE_BOX_LEVEL = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
})

export const MESSAGE_BOX_RESULT = Object.freeze({
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
  REPLACED: 'replaced',
})

export function isMessageBoxMode(value) {
  return Object.values(MESSAGE_BOX_MODE).includes(value)
}

export function isMessageBoxLevel(value) {
  return Object.values(MESSAGE_BOX_LEVEL).includes(value)
}

export function isMessageBoxResult(value) {
  return Object.values(MESSAGE_BOX_RESULT).includes(value)
}
