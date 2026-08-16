import appLocale from '#shell/locales/en/index.js'
import common from './common.js'
import folderDialog from './surfaces/folder-dialog.js'
import formModal from './surfaces/form-modal.js'
import mainWindow from './surfaces/main-window.js'
import messageBox from './surfaces/message-box.js'
import syncSession from './surfaces/sync-session.js'

export default {
  ...common,
  ...folderDialog,
  ...mainWindow,
  ...formModal,
  ...syncSession,
  ...messageBox,
  ...appLocale,
}
