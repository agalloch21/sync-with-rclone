import { createApp } from 'vue'
import i18n from './i18n.js'
import MainPanel from './MainApp.vue'
import './assets/styles.css'
import './assets/input-policy.css'

const app = createApp(MainPanel)
app.use(i18n)
app.mount('#app')
