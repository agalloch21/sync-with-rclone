import { createApp } from 'vue'
import i18n from './i18n.js'
import SyncSession from './SyncSession.vue'
import './assets/styles.css'

const app = createApp(SyncSession)
app.use(i18n)
app.mount('#app')
