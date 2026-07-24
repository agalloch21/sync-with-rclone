import { APP_ERROR_CODE } from '../app-errors.js'

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

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isSerializableValue(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true

  if (Array.isArray(value)) {
    if (seen.has(value))
      return false
    seen.add(value)
    const valid = value.every(item => isSerializableValue(item, seen))
    seen.delete(value)
    return valid
  }

  if (!isPlainObject(value) || seen.has(value))
    return false

  seen.add(value)
  const valid = Object.values(value).every(item => isSerializableValue(item, seen))
  seen.delete(value)
  return valid
}

function hasValidParams(state) {
  return state.params === undefined || (isPlainObject(state.params) && isSerializableValue(state.params))
}

function hasValidDetail(state) {
  return state.detail === undefined || typeof state.detail === 'string'
}

function isMessageBoxText(value) {
  return isPlainObject(value)
    && typeof value.message === 'string'
    && (value.title === undefined || typeof value.title === 'string')
}

function formatErrorDetail(error) {
  const fieldDetail = Object.values(error?.fields || {})
    .filter(Boolean)
    .join('\n')

  if (fieldDetail || error?.detail)
    return fieldDetail || error.detail

  return error?.message || ''
}

export function isMessageBoxMode(value) {
  return Object.values(MESSAGE_BOX_MODE).includes(value)
}

export function isMessageBoxLevel(value) {
  return Object.values(MESSAGE_BOX_LEVEL).includes(value)
}

export function isMessageBoxResult(value) {
  return Object.values(MESSAGE_BOX_RESULT).includes(value)
}

export function isMessageBoxState(value) {
  if (!isPlainObject(value)
    || !isMessageBoxMode(value.mode)
    || !hasValidParams(value)
    || !hasValidDetail(value)) {
    return false
  }

  const hasKey = value.key !== undefined
  const hasText = value.text !== undefined

  if (hasKey === hasText)
    return false
  if (hasKey && !isNonEmptyString(value.key))
    return false
  if (hasText && !isMessageBoxText(value.text))
    return false
  if (hasText && value.params !== undefined)
    return false

  if (value.mode === MESSAGE_BOX_MODE.MESSAGE)
    return isMessageBoxLevel(value.level)

  return value.level === undefined
}

export function normalizeMessageBoxState(payload = {}) {
  if (!isPlainObject(payload))
    throw new TypeError('Message-box state must be an object.')

  const mode = payload.mode ?? MESSAGE_BOX_MODE.MESSAGE

  if (!isMessageBoxMode(mode))
    throw new TypeError(`Invalid message-box mode: ${mode}`)
  if (mode !== MESSAGE_BOX_MODE.MESSAGE && payload.level !== undefined)
    throw new TypeError(`Message-box level is not valid for ${mode} mode.`)

  const level = mode === MESSAGE_BOX_MODE.MESSAGE
    ? payload.level ?? MESSAGE_BOX_LEVEL.INFO
    : undefined
  const state = {
    mode,
    ...(level !== undefined && { level }),
    ...(payload.key !== undefined && { key: payload.key }),
    ...(payload.params !== undefined && { params: payload.params }),
    ...(payload.detail !== undefined && { detail: payload.detail }),
    ...(payload.text !== undefined && { text: payload.text }),
  }

  if (!isMessageBoxState(state))
    throw new TypeError('Invalid message-box state.')

  return state
}

export function createMessageBoxErrorState(error = {}) {
  return {
    mode: MESSAGE_BOX_MODE.MESSAGE,
    level: MESSAGE_BOX_LEVEL.ERROR,
    key: `errors.${error?.code || APP_ERROR_CODE.UNKNOWN}`,
    params: error?.meta || {},
    detail: formatErrorDetail(error),
  }
}
