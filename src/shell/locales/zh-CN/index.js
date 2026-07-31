import server from './domains/server.js'
import syncTask from './domains/sync-task.js'
import errors from './errors.js'

export default {
  messages: {
    ...server.messages,
    ...syncTask.messages,
  },
  errors: {
    ...errors.errors,
    ...server.errors,
    ...syncTask.errors,
  },
  operations: {
    ...server.operations,
    ...syncTask.operations,
  },
}
