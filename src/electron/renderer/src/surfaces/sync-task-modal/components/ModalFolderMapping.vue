<script setup>
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import { computed, onMounted, ref, watch } from 'vue'
import FolderSelection from './FolderSelection.vue'
import ModalShell from './ModalShell.vue'

const props = defineProps({
  modalName: {
    type: String,
    required: true,
  },
  context: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits(['onClickCancel', 'onClickConfirm'])

const ACTION_MODE = {
  EDIT: 'edit',
  CREATE: 'create',
}
const mode = ref(props.modalName === SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING ? ACTION_MODE.EDIT : ACTION_MODE.CREATE)

const localBasePath = ref(props.context?.selectedSyncTask?.localBasePath || '')
const remoteBasePath = ref(Object.hasOwn(props.context?.selectedSyncTask || {}, 'remoteBasePath') ? props.context?.selectedSyncTask?.remoteBasePath : '')
</script>

<template>
  <ModalShell :modal-name="modalName" :title="$t(`syncTasks.modals.${modalName}.title`)" :message="$t(`syncTasks.modals.${modalName}.message`)">
    <div class="content-stage h-full flex justify-center items-center gap-5">
      <div class="folder-selection-dock">
        <FolderSelection side="local" :path="localBasePath" />
      </div>
      <span class="icon-[custom--connection] text-3xl text-(--text-primary)" />
      <div class="folder-selection-dock">
        <FolderSelection side="remote" :path="remoteBasePath" />
      </div>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" @click="$emit('onClickConfirm')">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>

<style scoped>
@reference "tailwindcss";
.folder-selection-dock{
  @apply w-60;
}
</style>
