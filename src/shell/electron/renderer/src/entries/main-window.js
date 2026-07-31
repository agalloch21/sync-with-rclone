import { createApp } from 'vue'
import i18n from '../i18n/index.js'
import MainWindow from '../surfaces/main-window/MainWindow.vue'
import '../assets/styles.css'
import '../assets/input-policy.css'

const app = createApp(MainWindow)
app.use(i18n)
app.mount('#app')
