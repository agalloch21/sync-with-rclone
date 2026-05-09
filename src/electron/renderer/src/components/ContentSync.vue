<script setup>
import { STEP_META, STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'

const state = inject('state')

const phase = computed(() => state.value?.step === STEPS.SYNC ? (state.value?.phase || '') : '')
const showProgress = computed(() => phase.value === STEP_META[STEPS.SYNC].phases[1])
const transferProgress = computed(() => showProgress.value ? state.value?.progress?.transfer : null)
const phaseProgress = computed(() => showProgress.value ? state.value?.progress?.phase : null)
const activeProgress = computed(() => transferProgress.value || phaseProgress.value || null)
const current = computed(() => activeProgress.value?.current || 0)
const total = computed(() => activeProgress.value?.total || 0)
const percent = computed(() => total.value > 0 ? Math.min(100, current.value / total.value * 100) : 0)
const description = computed(() => activeProgress.value?.message || '')

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0)
    return '0 B'

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

const progressLabel = computed(() => {
  if (transferProgress.value)
    return `${formatBytes(current.value)} / ${formatBytes(total.value)}`

  return `Phase ${current.value} of ${total.value} in Progress`
})
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
          :style="{ width: `${percent}%` }"
        />
      </div>
      <div class="text-(--text-primary) text-sm">
        {{ progressLabel }}
      </div>
      <div class="text-(--text-subtle) text-xs allow-select">
        {{ $t(`syncPhases.${description}`) }}
      </div>
    </div>
  </div>
</template>
