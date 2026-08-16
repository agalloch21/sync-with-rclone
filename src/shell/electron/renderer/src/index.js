import {
  isValidRendererSurface,
  RENDERER_SURFACE,
} from '#electron/contracts/renderer-surface.js'
import { createApp } from 'vue'
import i18n from './i18n/index.js'
import './assets/styles.css'
import './assets/input-policy.css'

const SURFACE_DEFINITIONS = Object.freeze({
  [RENDERER_SURFACE.MAIN_WINDOW]: {
    title: 'Sync with rclone',
    load: () => import('./surfaces/main-window/MainWindow.vue'),
  },
  [RENDERER_SURFACE.MESSAGE_BOX]: {
    title: 'Message',
    load: () => import('./surfaces/message-box/MessageBox.vue'),
  },
  [RENDERER_SURFACE.FOLDER_DIALOG]: {
    title: 'Select Folder',
    load: () => import('./surfaces/folder-dialog/FolderDialog.vue'),
  },
  [RENDERER_SURFACE.SYNC_SESSION]: {
    title: 'Sync Session',
    load: () => import('./surfaces/sync-session/SyncSession.vue'),
  },
  [RENDERER_SURFACE.FORM_MODAL]: {
    title: 'Form',
    load: () => import('./surfaces/form-modal/FormModal.vue'),
  },
})

async function mountRendererSurface() {
  const surface = new URLSearchParams(window.location.search).get('surface') || ''
  if (!isValidRendererSurface(surface))
    throw new TypeError(`Unknown renderer surface: ${surface}`)

  const definition = SURFACE_DEFINITIONS[surface]
  const { default: rootComponent } = await definition.load()

  document.title = definition.title
  createApp(rootComponent)
    .use(i18n)
    .mount('#app')
}

mountRendererSurface().catch(error => console.error(error))
