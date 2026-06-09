import { createApp } from 'vue'
import i18n from './i18n.js'
import TaskModal from './TaskModal.vue'
import './assets/styles.css'
import './assets/input-policy.css'

const app = createApp(TaskModal)
app.use(i18n)
app.mount('#app')
