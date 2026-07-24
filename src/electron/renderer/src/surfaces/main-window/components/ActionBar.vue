<script setup>
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'

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
const primaryAction = {
  name: 'create',
  modalName: SYNC_TASK_MODALS.CHOOSE_SERVER,
}
const serverActions = [
  { name: 'edit', modalName: SYNC_TASK_MODALS.EDIT_SERVER },
  { name: 'delete', modalName: SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER },
]
const taskActions = [
  { name: 'edit', modalName: SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING },
  { name: 'delete', modalName: SYNC_TASK_MODALS.CONFIRM_DELETE_TASK },
  { name: 'editPatterns', modalName: SYNC_TASK_MODALS.EDIT_PATTERNS },
]
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" @click="emit('openSyncTaskModal', primaryAction.modalName)">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      {{ $t(`syncTasksPanel.actions.${primaryAction.name}`) }}
    </Button>
    <span class="shrink-0 bg-(--surface-soft) w-0.5" />
    <div v-if="isServerSelected || isTaskSelected" class="flex gap-4">
      <Button
        v-for="action in (isTaskSelected ? taskActions : serverActions)" :key="action.modalName"
        :primary="false" :wide="false" @click="emit('openSyncTaskModal', action.modalName)"
      >
        {{ $t(`syncTasksPanel.actions.${action.name}`) }}
      </Button>
    </div>
  </div>
</template>
