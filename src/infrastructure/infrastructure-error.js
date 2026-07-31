export class InfrastructureError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause })
    this.name = 'InfrastructureError'
    this.code = code
    this.detail = options.detail
    this.meta = options.meta
  }
}

export function throwInfrastructureError(code, message, options = {}) {
  throw new InfrastructureError(code, message, options)
}
