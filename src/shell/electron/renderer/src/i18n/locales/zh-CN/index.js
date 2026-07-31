import appLocale from '#shell/locales/zh-CN/index.js'
import common from './common.js'
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
  ...appLocale,
}
