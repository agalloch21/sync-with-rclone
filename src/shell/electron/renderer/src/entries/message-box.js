import { createApp } from 'vue'
import i18n from '../i18n/index.js'
import MessageBox from '../surfaces/message-box/MessageBox.vue'
import '../assets/styles.css'
import '../assets/input-policy.css'

const app = createApp(MessageBox)
app.use(i18n)
app.mount('#app')
