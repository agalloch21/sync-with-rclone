<script setup>
import { SYNC_TASK_MODALS } from '#src/electron/contracts/sync-task-modal.js'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalChooseServer from './components/ModalChooseServer.vue'
import ModalEditPatterns from './components/ModalEditPatterns.vue'
import ModalFolderMapping from './components/ModalFolderMapping.vue'
import ModalServer from './components/ModalServer.vue'

const { t } = useI18n()

const modalName = ref('')
const context = ref({})
// const wizardState = ref({
//   selectedRemoteName: '',
// })

const ACTION_COMPONENT = {
  [SYNC_TASK_MODALS.CHOOSE_SERVER]: ModalChooseServer,
  [SYNC_TASK_MODALS.CREATE_SERVER]: ModalServer,
  [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: ModalFolderMapping,
  [SYNC_TASK_MODALS.EDIT_SERVER]: ModalServer,
  [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: ModalFolderMapping,
  [SYNC_TASK_MODALS.EDIT_PATTERNS]: ModalEditPatterns,
}
const modalComponent = computed(() => ACTION_COMPONENT[modalName.value] || ModalChooseServer)

function closeModal() {
  window.syncTaskModal?.close?.()
}

function onClickNext(newModalName, payload = {}) {
  context.value = {
    ...context.value,
    ...payload,
  }
  modalName.value = newModalName
}

function onClickConfirm() {
  closeModal()
}

onMounted(async () => {
  const state = await window.syncTaskModal?.getState?.() || { modalName: '', context: {} }
  modalName.value = state.modalName || ''
  context.value = state.context || { selectedServer: null, selectedSyncTask: null }

  await nextTick()
  await document.fonts.ready
  window.syncTaskModal?.ready?.({ title: t(`syncTaskModal.${modalName.value}.title`, '') })
})
</script>

<template>
  <div class="task-modal-dock">
    <component
      :is="modalComponent"
      :modal-name="modalName"
      :context="context"
      @on-click-cancel="closeModal"
      @on-click-next="onClickNext"
      @on-click-confirm="onClickConfirm"
    />
  </div>
</template>
