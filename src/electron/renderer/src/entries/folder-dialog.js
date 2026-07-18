import { createApp } from 'vue'
import i18n from '../i18n/index.js'
import FolderDialog from '../surfaces/folder-dialog/FolderDialog.vue'
import '../assets/styles.css'
import '../assets/input-policy.css'

const app = createApp(FolderDialog)
app.use(i18n)
app.mount('#app')
