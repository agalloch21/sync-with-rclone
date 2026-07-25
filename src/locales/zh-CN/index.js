import server from './domains/server.js'
import syncTask from './domains/sync-task.js'
import infrastructure from './infrastructure.js'

export default {
  messages: {
    ...server.messages,
    ...syncTask.messages,
  },
  errors: {
    ...infrastructure.errors,
    ...server.errors,
    ...syncTask.errors,
  },
  operations: {
    ...server.operations,
    ...syncTask.operations,
  },
}
