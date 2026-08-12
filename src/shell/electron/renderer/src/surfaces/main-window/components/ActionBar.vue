<script setup>
import Button from '#frontend/surfaces/shared/Button.vue'
import { computed } from 'vue'
import {
  ACTION_BAR_MAPPING_ACTIONS,
  ACTION_BAR_PRIMARY_ACTION,
  ACTION_BAR_SERVER_ACTIONS,
} from './ActionBar.presentation.js'

const props = defineProps({
  isServerSelected: {
    type: Boolean,
    default: false,
  },
  isMappingSelected: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  configurationUnavailable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['requestAction'])
const contextualActions = computed(() => props.isMappingSelected
  ? ACTION_BAR_MAPPING_ACTIONS
  : ACTION_BAR_SERVER_ACTIONS)
const contextualActionsDisabled = computed(() => props.isLoading
  || props.configurationUnavailable
  || (!props.isMappingSelected && !props.isServerSelected))
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" :disabled="isLoading || configurationUnavailable" @click="emit('requestAction', ACTION_BAR_PRIMARY_ACTION.action)">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      {{ $t(`mappingsPanel.actions.${ACTION_BAR_PRIMARY_ACTION.name}`) }}
    </Button>
    <span class="shrink-0 bg-(--surface-soft) w-0.5" />
    <div class="flex gap-4">
      <Button
        v-for="action in contextualActions" :key="action.action"
        :primary="false" :wide="false" :disabled="contextualActionsDisabled" @click="emit('requestAction', action.action)"
      >
        {{ $t(`mappingsPanel.actions.${action.name}`) }}
      </Button>
    </div>
  </div>
</template>
