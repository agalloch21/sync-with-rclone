import { createApp } from 'vue'
import i18n from '../i18n/index.js'
import SyncTaskModal from '../surfaces/sync-task-modal/SyncTaskModal.vue'
import '../assets/styles.css'
import '../assets/input-policy.css'

const app = createApp(SyncTaskModal)
app.use(i18n)
app.mount('#app')
