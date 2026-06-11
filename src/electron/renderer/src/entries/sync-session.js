import { createApp } from 'vue'
import i18n from '../i18n/index.js'
import SyncSession from '../surfaces/sync-session/SyncSession.vue'
import '../assets/styles.css'
import '../assets/input-policy.css'

const app = createApp(SyncSession)
app.use(i18n)
app.mount('#app')
