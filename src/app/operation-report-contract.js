import { APP_ERROR_CODE } from './app-errors.js'

export const OPERATION_REPORT_MODE = Object.freeze({
  MESSAGE: 'message',
  CONFIRM: 'confirm',
  PROGRESS: 'progress',
})

export const OPERATION_REPORT_LEVEL = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
})

export const OPERATION_REPORT_ACKNOWLEDGEMENT = Object.freeze({
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

function isOperationReportText(value) {
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

export function isOperationReportMode(value) {
  return Object.values(OPERATION_REPORT_MODE).includes(value)
}

export function isOperationReportLevel(value) {
  return Object.values(OPERATION_REPORT_LEVEL).includes(value)
}

export function isOperationReportAcknowledgement(value) {
  return Object.values(OPERATION_REPORT_ACKNOWLEDGEMENT).includes(value)
}

export function isOperationReportState(value) {
  if (!isPlainObject(value)
    || !isOperationReportMode(value.mode)
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
  if (hasText && !isOperationReportText(value.text))
    return false
  if (hasText && value.params !== undefined)
    return false

  if (value.mode === OPERATION_REPORT_MODE.MESSAGE)
    return isOperationReportLevel(value.level)

  return value.level === undefined
}

export function normalizeOperationReportState(payload = {}) {
  if (!isPlainObject(payload))
    throw new TypeError('Operation report state must be an object.')

  const mode = payload.mode ?? OPERATION_REPORT_MODE.MESSAGE

  if (!isOperationReportMode(mode))
    throw new TypeError(`Invalid operation report mode: ${mode}`)
  if (mode !== OPERATION_REPORT_MODE.MESSAGE && payload.level !== undefined)
    throw new TypeError(`Operation report level is not valid for ${mode} mode.`)

  const level = mode === OPERATION_REPORT_MODE.MESSAGE
    ? payload.level ?? OPERATION_REPORT_LEVEL.INFO
    : undefined
  const state = {
    mode,
    ...(level !== undefined && { level }),
    ...(payload.key !== undefined && { key: payload.key }),
    ...(payload.params !== undefined && { params: payload.params }),
    ...(payload.detail !== undefined && { detail: payload.detail }),
    ...(payload.text !== undefined && { text: payload.text }),
  }

  if (!isOperationReportState(state))
    throw new TypeError('Invalid operation report state.')

  return state
}

export function createOperationErrorReportState(error = {}) {
  return {
    mode: OPERATION_REPORT_MODE.MESSAGE,
    level: OPERATION_REPORT_LEVEL.ERROR,
    key: `errors.${error?.code || APP_ERROR_CODE.UNKNOWN}`,
    params: error?.meta || {},
    detail: formatErrorDetail(error),
  }
}
