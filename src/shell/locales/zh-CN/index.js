import mapping from './domains/mapping.js'
import server from './domains/server.js'
import errors from './errors.js'

export default {
  messages: {
    ...server.messages,
    ...mapping.messages,
  },
  errors: {
    ...errors.errors,
    ...server.errors,
    ...mapping.errors,
  },
  operations: {
    ...server.operations,
    ...mapping.operations,
  },
}
