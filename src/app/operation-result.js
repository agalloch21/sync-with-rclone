import { AppError } from './app-errors.js'

export function toSuccessfulResult(value) {
  return {
    success: true,
    ...(value !== null && { value }),
  }
}

export function toFailureResult(error) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        detail: error.detail,
        fields: error.fields,
        meta: error.meta,
      },
    }
  }

  return {
    success: false,
    error: {
      code: error?.code ?? 'unexpected_error',
      message: error?.message ?? 'Something went wrong.',
      detail: error?.detail ?? '',
    },
  }
}

export function unwrapResult(result) {
  if (!result || typeof result !== 'object' || !result.success) {
    return null
  }
  return result.value
}
