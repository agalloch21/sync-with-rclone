<script setup>
import { SYNC_RESULT } from '#src/core/contract.js'
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'

const state = inject('state')

const result = computed(() => state.value?.final?.result)
</script>

<template>
  <div v-if="result === SYNC_RESULT.COMPLETED">
    completed
  </div>
  <div v-else-if="result === SYNC_RESULT.CANCELLED">
    cancelled
  </div>
  <div v-else-if="result === SYNC_RESULT.FAILED">
    error
  </div>
</template>
