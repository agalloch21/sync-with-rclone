<script setup>
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalChooseServer from './components/ModalChooseServer.vue'
import ModalConfirmDeleteServer from './components/ModalConfirmDeleteServer.vue'
import ModalConfirmDeleteTask from './components/ModalConfirmDeleteTask.vue'
import ModalCreateFolderMapping from './components/ModalCreateFolderMapping.vue'
import ModalCreateServer from './components/ModalCreateServer.vue'
import ModalEditFolderMapping from './components/ModalEditFolderMapping.vue'
import ModalEditPatterns from './components/ModalEditPatterns.vue'
import ModalEditServer from './components/ModalEditServer.vue'

const { t } = useI18n()

const state = window.syncTaskModal?.getState?.() || { modalName: '' }
const modalName = ref(state.modalName)
const title = computed(() => modalName.value?.length > 0 ? t(`syncTasks.modals.${modalName.value}.title`) : '')

const ACTION_COMPONENT = {
  [SYNC_TASK_MODALS.CHOOSE_SERVER]: ModalChooseServer,
  [SYNC_TASK_MODALS.CREATE_SERVER]: ModalCreateServer,
  [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: ModalCreateFolderMapping,
  [SYNC_TASK_MODALS.EDIT_SERVER]: ModalEditServer,
  [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: ModalEditFolderMapping,
  [SYNC_TASK_MODALS.EDIT_PATTERNS]: ModalEditPatterns,
  [SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]: ModalConfirmDeleteServer,
  [SYNC_TASK_MODALS.CONFIRM_DELETE_TASK]: ModalConfirmDeleteTask,

}
const modalComponent = computed(() => ACTION_COMPONENT[modalName.value] || ModalChooseServer)

function closeModal() {
  window.syncTaskModal?.close?.()
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
  window.syncTaskModal?.ready?.({ title: title.value })
})
</script>

<template>
  <div class="task-modal-dock">
    <component :is="modalComponent" @on-click-cancel="closeModal" @on-click-next="onClickNext" @on-click-confirm="onClickConfirm" />
  </div>
</template>
