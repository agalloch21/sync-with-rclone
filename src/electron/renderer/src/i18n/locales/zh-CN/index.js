import common from './common.js'
import server from './domains/server.js'
import syncTask from './domains/sync-task.js'
import infrastructure from './infrastructure.js'
import messageBox from './message-box.js'
import mainWindow from './surfaces/main-window.js'
import syncSession from './surfaces/sync-session.js'
import syncTasks from './surfaces/sync-tasks.js'

export default {
  ...common,
  ...mainWindow,
  ...syncTasks,
  ...syncSession,
  ...messageBox,
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
