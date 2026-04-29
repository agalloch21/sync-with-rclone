<script setup>
import { SESSION_STATES, STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'

const state = inject('state')

const session = computed(() => state.value?.session)
const step = computed(() => state.value?.step)
</script>

<template>
  <div v-if="session === SESSION_STATES.COMPLETED">
    completed
  </div>
  <div v-else-if="session === SESSION_STATES.CANCELLED && step === STEPS.SYNC">
    cancelled
  </div>
  <div v-else-if="session === SESSION_STATES.ERROR">
    error
  </div>
</template>
