import common from './common.js'
import server from './domains/server.js'
import syncTask from './domains/sync-task.js'
import infrastructure from './infrastructure.js'
import mainWindow from './surfaces/main-window.js'
import messageBox from './surfaces/message-box.js'
import syncSession from './surfaces/sync-session.js'
import syncTaskModal from './surfaces/sync-task-modal.js'

export default {
  ...common,
  ...mainWindow,
  ...syncTaskModal,
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
