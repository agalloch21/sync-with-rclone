<script setup>
import Button from '#frontend/surfaces/shared/Button.vue'
import {
  ACTION_BAR_PRIMARY_ACTION,
  ACTION_BAR_SERVER_ACTIONS,
  ACTION_BAR_TASK_ACTIONS,
} from './ActionBar.presentation.js'

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
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" @click="emit('requestAction', ACTION_BAR_PRIMARY_ACTION.action)">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      {{ $t(`syncTasksPanel.actions.${ACTION_BAR_PRIMARY_ACTION.name}`) }}
    </Button>
    <span class="shrink-0 bg-(--surface-soft) w-0.5" />
    <div v-if="isTaskSelected || isServerSelected" class="flex gap-4">
      <Button
        v-for="action in (isTaskSelected ? ACTION_BAR_TASK_ACTIONS : ACTION_BAR_SERVER_ACTIONS)" :key="action.action"
        :primary="false" :wide="false" @click="emit('requestAction', action.action)"
      >
        {{ $t(`syncTasksPanel.actions.${action.name}`) }}
      </Button>
    </div>
  </div>
</template>
