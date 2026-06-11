<script setup>
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'

defineProps({
  isServerSelected: {
    type: Boolean,
    default: false,
  },
  isTaskSelected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['openSyncTaskModal'])
const primaryModal = SYNC_TASK_MODALS.CHOOSE_SERVER
const serverModals = [SYNC_TASK_MODALS.EDIT_SERVER, SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]
const taskModals = [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING, SYNC_TASK_MODALS.CONFIRM_DELETE_TASK, SYNC_TASK_MODALS.EDIT_PATTERNS]
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" @click="emit('openSyncTaskModal', primaryModal)">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      {{ $t(`syncTasks.toolbar.${primaryModal}`) }}
    </Button>
    <span class="shrink-0 bg-(--surface-soft) w-0.5" />
    <div v-if="isServerSelected || isTaskSelected" class="flex gap-4">
      <Button
        v-for="modalName in (isTaskSelected ? taskModals : serverModals)" :key="modalName"
        :primary="false" :wide="false" @click="emit('openSyncTaskModal', modalName)"
      >
        {{ $t(`syncTasks.toolbar.${modalName}`) }}
      </Button>
    </div>
  </div>
</template>
