<script setup>
import Button from '#frontend/surfaces/shared/Button.vue'
import { MAIN_WINDOW_ACTION } from '../main-window-action.js'

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

const emit = defineEmits(['requestAction'])
const primaryAction = {
  name: 'create',
  action: MAIN_WINDOW_ACTION.CREATE_TASK,
}
const serverActions = [
  { name: 'edit', action: MAIN_WINDOW_ACTION.EDIT_SERVER },
  { name: 'delete', action: MAIN_WINDOW_ACTION.DELETE_SERVER },
]
const taskActions = [
  { name: 'edit', action: MAIN_WINDOW_ACTION.EDIT_FOLDER_MAPPING },
  { name: 'delete', action: MAIN_WINDOW_ACTION.DELETE_TASK },
  { name: 'editPatterns', action: MAIN_WINDOW_ACTION.EDIT_PATTERNS },
]
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" @click="emit('requestAction', primaryAction.action)">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      {{ $t(`syncTasksPanel.actions.${primaryAction.name}`) }}
    </Button>
    <span class="shrink-0 bg-(--surface-soft) w-0.5" />
    <div v-if="isTaskSelected || isServerSelected" class="flex gap-4">
      <Button
        v-for="action in (isTaskSelected ? taskActions : serverActions)" :key="action.action"
        :primary="false" :wide="false" @click="emit('requestAction', action.action)"
      >
        {{ $t(`syncTasksPanel.actions.${action.name}`) }}
      </Button>
    </div>
  </div>
</template>
