<script setup>
import { MAIN_ACTIONS } from '#src/app/contract.js'
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalChooseServer from './components/main/ModalChooseServer.vue'
import ModalCreateServer from './components/main/ModalCreateServer.vue'
import ModalCreateTask from './components/main/ModalCreateTask.vue'
import ModalEditPatterns from './components/main/ModalEditPatterns.vue'
import ModalEditServer from './components/main/ModalEditServer.vue'
import ModalEditTask from './components/main/ModalEditTask.vue'

const { t } = useI18n()

const state = window.taskModal?.getState?.() || { action: '' }
const title = state?.action?.length > 0 ? t(`main.actions.${state.action}.modalTitle`) : ''
const modalName = ref(state.action)

const ACTION_COMPONENT = {
  [MAIN_ACTIONS.CHOOSE_SERVER]: ModalChooseServer,
  [MAIN_ACTIONS.CREATE_SERVER]: ModalCreateServer,
  [MAIN_ACTIONS.EDIT_SERVER]: ModalEditServer,
  [MAIN_ACTIONS.DELETE_SERVER]: null,

  [MAIN_ACTIONS.CREATE_TASK]: ModalCreateTask,
  [MAIN_ACTIONS.EDIT_TASK]: ModalEditTask,
  [MAIN_ACTIONS.DELETE_TASK]: null,
  [MAIN_ACTIONS.EDIT_PATTERNS]: ModalEditPatterns,

}
const modalComponent = computed(() => ACTION_COMPONENT[modalName.value] || ModalChooseServer)

function closeModal() {
  window.taskModal?.close?.()
}

function onClickNext(newModalName) {
  modalName.value = newModalName
}

function onClickConfirm() {
  closeModal()
}

onMounted(async () => {
  await nextTick()
  await document.fonts.ready
  window.taskModal?.ready?.({ title })
})
</script>

<template>
  <div class="task-modal-dock">
    <component :is="modalComponent" @on-click-cancel="closeModal" @on-click-next="onClickNext" @on-click-confirm="onClickConfirm" />
  </div>
</template>
