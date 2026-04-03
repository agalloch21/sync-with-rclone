<script setup>
import { computed, onMounted, ref } from 'vue'

const state = ref(null)
const errorMessage = ref('')

const progressPercent = computed(() => {
  const phaseCount = state.value?.phaseCount || 0
  const completedPhaseCount = state.value?.completedPhaseCount || 0
  if (phaseCount === 0)
    return 0

  return Math.round((completedPhaseCount / phaseCount) * 100)
})

onMounted(async () => {
  try {
    state.value = await window.syncProgress.getState()
    window.syncProgress.onUpdate((nextState) => {
      state.value = nextState
    })
  }
  catch (error) {
    errorMessage.value = error?.message || String(error)
    console.error('Failed to initialize progress renderer', error)
  }
})
</script>

<template>
  <div v-if="errorMessage" class="layout">
    <div class="header">
      <h1 class="title">Sync Progress</h1>
    </div>
    <div class="content">
      <div class="error-panel">
        Failed to initialize progress renderer: {{ errorMessage }}
      </div>
    </div>
  </div>

  <div v-else-if="state" class="layout progress-layout">
    <div class="header">
      <h1 class="title">{{ state.title }}</h1>
      <div class="roots">
        {{ state.detail }}
      </div>
    </div>

    <div class="content progress-content">
      <div class="progress-shell">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
      <div class="progress-meta">
        {{ progressPercent }}%
      </div>
      <div class="progress-current">
        {{ state.currentPhaseLabel || 'Waiting for execution...' }}
      </div>
      <div class="progress-count">
        {{ state.completedPhaseCount }} / {{ state.phaseCount }} phase(s) complete
      </div>
    </div>
  </div>

  <div v-else class="layout">
    <div class="header">
      <h1 class="title">Sync Progress</h1>
    </div>
    <div class="content">
      <div class="empty">
        Loading progress view...
      </div>
    </div>
  </div>
</template>

