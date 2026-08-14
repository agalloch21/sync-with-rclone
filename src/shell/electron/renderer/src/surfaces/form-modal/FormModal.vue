<script setup>
import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ChooseServerView from './components/ChooseServerView.vue'
import FilterPatternsView from './components/FilterPatternsView.vue'
import FolderMappingView from './components/FolderMappingView.vue'
import ServerView from './components/ServerView.vue'

const { t } = useI18n()

const view = ref(null)
const context = ref({})
// const wizardState = ref({
//   selectedRemoteName: '',
// })

const VIEW_COMPONENT = {
  [FORM_MODAL_VIEW.CHOOSE_SERVER]: ChooseServerView,
  [FORM_MODAL_VIEW.CREATE_SERVER]: ServerView,
  [FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING]: FolderMappingView,
  [FORM_MODAL_VIEW.EDIT_SERVER]: ServerView,
  [FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING]: FolderMappingView,
  [FORM_MODAL_VIEW.EDIT_PATTERNS]: FilterPatternsView,
}
const modalComponent = computed(() => VIEW_COMPONENT[view.value])

function closeModal() {
  window.formModal?.close?.()
}

function onClickNext(nextView, payload = {}) {
  context.value = {
    ...context.value,
    ...payload,
  }
  view.value = nextView
}

function onClickConfirm() {
  closeModal()
}

onMounted(async () => {
  const state = await window.formModal?.getState?.()
  if (!VIEW_COMPONENT[state?.view]) {
    closeModal()
    return
  }

  view.value = state.view
  context.value = state.context || { selectedServer: null, selectedMapping: null }

  await nextTick()
  await document.fonts.ready
  window.formModal?.ready?.({ title: t(`formModal.${view.value}.title`, '') })
})
</script>

<template>
  <div class="form-modal-dock">
    <component
      :is="modalComponent"
      v-if="modalComponent"
      :view="view"
      :context="context"
      @on-click-cancel="closeModal"
      @on-click-next="onClickNext"
      @on-click-confirm="onClickConfirm"
    />
  </div>
</template>
