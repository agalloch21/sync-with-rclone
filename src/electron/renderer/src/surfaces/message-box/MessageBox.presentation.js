import {
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/operations/operation-report-contract.js'

function translateIfPresent(te, t, key, params, fallback) {
  return te(key) ? t(key, params) : fallback
}

function getDefaultTitle(state, te, t) {
  if (state.mode === OPERATION_REPORT_MODE.CONFIRM)
    return t('messageBox.confirmation.title')
  if (state.mode === OPERATION_REPORT_MODE.PROGRESS)
    return t('messageBox.progress.title')

  const key = `messageBox.levels.${state.level}.title`
  return translateIfPresent(te, t, key, {}, t('messageBox.levels.info.title'))
}

function getFallbackMessage(state, t) {
  if (state.mode === OPERATION_REPORT_MODE.PROGRESS)
    return t('messageBox.progress.message')

  return t('messageBox.fallback.message')
}

function findInheritedPropertyKey(te, key, property) {
  const segments = key.split('.')

  while (segments.length > 0) {
    const candidate = `${segments.join('.')}.${property}`
    if (te(candidate))
      return candidate
    segments.pop()
  }

  return ''
}

function resolveKeyedPresentation(state, te, t) {
  const params = state.params || {}
  const titleKey = findInheritedPropertyKey(te, state.key, 'title')
  const messageKey = te(`${state.key}.message`)
    ? `${state.key}.message`
    : state.key

  return {
    title: translateIfPresent(
      te,
      t,
      titleKey,
      params,
      getDefaultTitle(state, te, t),
    ),
    message: translateIfPresent(
      te,
      t,
      messageKey,
      params,
      getFallbackMessage(state, t),
    ),
    detail: state.detail ?? translateIfPresent(te, t, `${state.key}.detail`, params, ''),
  }
}

export function resolveMessageBoxIconClass(state) {
  if (state.mode === OPERATION_REPORT_MODE.CONFIRM)
    return 'icon-[lucide--circle-question-mark] text-(--primary)'
  if (state.mode === OPERATION_REPORT_MODE.PROGRESS)
    return 'icon-[lucide--loader-circle] animate-spin text-(--primary)'
  if (state.level === OPERATION_REPORT_LEVEL.SUCCESS)
    return 'icon-[lucide--circle-check] text-(--success)'
  if (state.level === OPERATION_REPORT_LEVEL.WARNING)
    return 'icon-[lucide--circle-alert] text-(--warning)'
  if (state.level === OPERATION_REPORT_LEVEL.ERROR)
    return 'icon-[lucide--circle-x] text-(--danger)'
  return 'icon-[lucide--info] text-(--primary)'
}

export function resolveMessageBoxPresentation(state, { te, t }) {
  if (state.text) {
    return {
      title: state.text.title || getDefaultTitle(state, te, t),
      message: state.text.message,
      detail: state.detail || '',
    }
  }

  return resolveKeyedPresentation(state, te, t)
}
