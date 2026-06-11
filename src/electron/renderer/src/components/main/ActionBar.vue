<script setup>
import { MAIN_ACTIONS } from '#src/app/contract.js'
import Button from './Button.vue'

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

const emit = defineEmits(['openTaskModal'])
const primaryAction = MAIN_ACTIONS.CHOOSE_SERVER
const serverActions = [MAIN_ACTIONS.EDIT_SERVER, MAIN_ACTIONS.DELETE_SERVER]
const taskActions = [MAIN_ACTIONS.EDIT_TASK, MAIN_ACTIONS.DELETE_TASK, MAIN_ACTIONS.EDIT_PATTERNS]
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" @click="emit('openTaskModal', primaryAction)">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      {{ $t(`main.actions.${primaryAction}.buttonName`) }}
    </Button>
    <span class="shrink-0 bg-(--surface-soft) w-0.5" />
    <div v-if="isServerSelected || isTaskSelected" class="flex gap-4">
      <Button
        v-for="action in (isTaskSelected ? taskActions : serverActions)" :key="action"
        :primary="false" :wide="false" @click="emit('openTaskModal', action)"
      >
        {{ $t(`main.actions.${action}.buttonName`) }}
      </Button>
    </div>
  </div>
</template>
