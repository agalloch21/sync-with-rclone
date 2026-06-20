<script setup>
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalChooseServer from './components/ModalChooseServer.vue'
import ModalConfirmDeleteServer from './components/ModalConfirmDeleteServer.vue'
import ModalConfirmDeleteTask from './components/ModalConfirmDeleteTask.vue'
import ModalCreateFolderMapping from './components/ModalCreateFolderMapping.vue'
import ModalEditFolderMapping from './components/ModalEditFolderMapping.vue'
import ModalEditPatterns from './components/ModalEditPatterns.vue'
import ModalServer from './components/ModalServer.vue'

const { t } = useI18n()

const modalName = ref('')
const context = ref({})
const wizardState = ref({
  selectedRemoteName: '',
})
const title = computed(() => modalName.value?.length > 0 ? t(`syncTasks.modals.${modalName.value}.title`) : '')

const ACTION_COMPONENT = {
  [SYNC_TASK_MODALS.CHOOSE_SERVER]: ModalChooseServer,
  [SYNC_TASK_MODALS.CREATE_SERVER]: ModalServer,
  [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: ModalCreateFolderMapping,
  [SYNC_TASK_MODALS.EDIT_SERVER]: ModalServer,
  [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: ModalEditFolderMapping,
  [SYNC_TASK_MODALS.EDIT_PATTERNS]: ModalEditPatterns,
  [SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]: ModalConfirmDeleteServer,
  [SYNC_TASK_MODALS.CONFIRM_DELETE_TASK]: ModalConfirmDeleteTask,

}
const modalComponent = computed(() => ACTION_COMPONENT[modalName.value] || ModalChooseServer)

function closeModal() {
  window.syncTaskModal?.close?.()
}

function onClickNext(newModalName, payload = {}) {
  wizardState.value = {
    ...wizardState.value,
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
  context.value = state.context || {}
  await nextTick()
  await document.fonts.ready
  window.syncTaskModal?.ready?.({ title: title.value })
})
</script>

<template>
  <div class="task-modal-dock">
    <component
      :is="modalComponent"
      :modal-name="modalName"
      :wizard-state="wizardState"
      :context="context"
      :sync-task="context.syncTask"
      @on-click-cancel="closeModal"
      @on-click-next="onClickNext"
      @on-click-confirm="onClickConfirm"
    />
  </div>
</template>
