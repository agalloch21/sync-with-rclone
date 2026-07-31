import appLocale from '#shell/locales/zh-CN/index.js'
import common from './common.js'
import formModal from './surfaces/form-modal.js'
import mainWindow from './surfaces/main-window.js'
import messageBox from './surfaces/message-box.js'
import syncSession from './surfaces/sync-session.js'

export default {
  ...common,
  ...mainWindow,
  ...formModal,
  ...syncSession,
  ...messageBox,
  ...appLocale,
}
