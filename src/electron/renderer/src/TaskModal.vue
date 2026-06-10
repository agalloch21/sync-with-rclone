<script setup>
import { nextTick, onMounted, shallowRef } from 'vue'
import ModalCreateTask from './components/main/ModalCreateTask.vue'

const state = window.taskModal?.getState?.() || { action: '', title: 'Task' }

function closeModal() {
  window.taskModal?.close?.()
}

const modalComponent = shallowRef(ModalCreateTask)
onMounted(async () => {
  await nextTick()
  await document.fonts.ready
  window.taskModal?.ready?.()
})
</script>

<template>
  <div class="task-modal-dock">
    <component :is="modalComponent" @on-close-modal="closeModal" />
  </div>
</template>
