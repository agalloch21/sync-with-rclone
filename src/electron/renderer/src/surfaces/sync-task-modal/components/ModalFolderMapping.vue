<script setup>
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import { unwrapResult } from '#src/app/operation-result.js'
import { useTaskOperations } from '#src/electron/renderer/src/composables/useTaskOperations.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import { computed, ref } from 'vue'
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

const emit = defineEmits(['onClickCancel', 'onClickConfirm'])
const taskOperations = useTaskOperations(window.syncTaskModal)

const ACTION_MODE = {
  EDIT: 'edit',
  CREATE: 'create',
}
const mode = ref(props.modalName === SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING ? ACTION_MODE.EDIT : ACTION_MODE.CREATE)

const localBasePath = ref(props.context?.selectedSyncTask?.localBasePath ?? '')
const remoteBasePath = ref(props.context?.selectedSyncTask?.remoteBasePath ?? '')
const isSelectingFolder = ref(false)
const isSubmitting = ref(false)

const selectedServerName = computed(() => props.context?.selectedServer?.name || props.context?.selectedSyncTask?.rcloneRemote || '')

async function selectLocalFolder() {
  if (isSelectingFolder.value)
    return

  isSelectingFolder.value = true
  const result = await taskOperations.selectLocalFolder(localBasePath.value)
  if (result?.success) {
    const selectedPath = unwrapResult(result)
    if (typeof selectedPath === 'string')
      localBasePath.value = selectedPath
  }
  isSelectingFolder.value = false
}

async function selectRemoteFolder() {
  if (isSelectingFolder.value)
    return

  isSelectingFolder.value = true
  const result = await taskOperations.selectRemoteFolder(selectedServerName.value, remoteBasePath.value)
  if (result?.success) {
    const selectedPath = unwrapResult(result)
    if (typeof selectedPath === 'string')
      remoteBasePath.value = selectedPath
  }
  isSelectingFolder.value = false
}

async function submitMapping() {
  if (isSubmitting.value)
    return

  const expectedTask = {
    rcloneRemote: selectedServerName.value,
    localBasePath: localBasePath.value,
    remoteBasePath: remoteBasePath.value,
  }

  isSubmitting.value = true
  const result = mode.value === ACTION_MODE.EDIT
    ? await taskOperations.updateSyncTask(props.context?.selectedSyncTask, expectedTask)
    : await taskOperations.createSyncTask(expectedTask)
  isSubmitting.value = false

  if (result?.success)
    emit('onClickConfirm')
}
</script>

<template>
  <ModalShell :modal-name="modalName" :title="$t(`syncTasks.modals.${modalName}.title`)" :message="$t(`syncTasks.modals.${modalName}.message`)">
    <div class="content-stage h-full flex justify-center items-center gap-5">
      <div class="folder-selection-dock">
        <FolderSelection side="local" :path="localBasePath" @select="selectLocalFolder" />
      </div>
      <span class="icon-[custom--connection] text-3xl text-(--text-primary)" />
      <div class="folder-selection-dock">
        <FolderSelection side="remote" :path="remoteBasePath" @select="selectRemoteFolder" />
      </div>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting || isSelectingFolder" @click="submitMapping">
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
