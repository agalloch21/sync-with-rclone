<script setup>
import { STEP_META, STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'

const state = inject('state')

const phase = computed(() => state.value?.step === STEPS.SYNC ? (state.value?.phase?.name || '') : '')
const showProgress = computed(() => phase.value === STEP_META[STEPS.SYNC].phases[1])
const current = computed(() => showProgress.value ? (state.value?.progress?.current || 0) : 0)
const total = computed(() => showProgress.value ? (state.value?.progress?.total || 0) : 0)
const description = computed(() => showProgress.value ? (state.value?.progress?.message || '') : '')
</script>

<template>
  <div class="analyze-stage w-full h-full grid grid-rows-6 justify-items-stretch">
    <div class="row-start-2 font-medium text-center text-3xl text-(--text-primary)">
      {{ $t(phase) }}
    </div>
    <div
      v-if="showProgress"
      class="row-start-3 row-span-3 flex flex-col justify-center items-center gap-2 text-xs text-(--text-subtle)"
    >
      <div class="rounded-full w-3/4 h-4 bg-(--primary-soft)">
        <div
          class="rounded-full h-full bg-(--primary) transition-all duration-500"
          :style="{ width: `${current / total * 100}%` }"
        />
      </div>
      <div class="text-(--text-primary) text-sm">
        Phase {{ current }} of {{ total }} in Progress
      </div>
      <div class="text-(--text-subtle) text-xs">
        {{ $t(`syncPhases.${description}`) }}
      </div>
    </div>
  </div>
</template>
