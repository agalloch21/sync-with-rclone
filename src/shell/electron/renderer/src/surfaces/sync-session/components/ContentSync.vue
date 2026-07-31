<script setup>
import { SYNC_SESSION_STAGE, SYNC_SESSION_STAGE_META } from '#electron/contracts/sync-session-stage.js'
import { computed, inject } from 'vue'

const state = inject('state')

const phase = computed(() => state.value?.stage === SYNC_SESSION_STAGE.SYNC ? (state.value?.phase || '') : '')

const isApplyingSync = computed(() => phase.value === SYNC_SESSION_STAGE_META[SYNC_SESSION_STAGE.SYNC].phases[1])
const currentActivity = computed(() => state.value?.progress?.activity || '')
const currentActivityIndex = computed(() => state.value?.progress?.index || 0)
const totalActivityCount = computed(() => state.value?.progress?.total || 0)
const currentMeasurement = computed(() => state.value?.progress?.measurement?.current || 0)
const totalMeasurement = computed(() => state.value?.progress?.measurement?.total || 0)
const percent = computed(() => {
  if (totalActivityCount.value === 0) {
    return 0
  }
  else {
    let overallProgress = currentActivityIndex.value
    if (totalMeasurement.value !== 0) {
      overallProgress += currentMeasurement.value / totalMeasurement.value
    }
    return Math.min(100, (overallProgress / (totalActivityCount.value - 1)) * 100)
  }
})

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
</script>

<template>
  <div class="analyze-stage w-full h-full grid grid-rows-6">
    <div class="row-span-2 self-end py-4 font-medium text-center text-2xl text-(--text-primary)">
      {{ $t(phase) }}
    </div>
    <div
      v-if="isApplyingSync"
      class="flex flex-col justify-center items-center gap-2"
    >
      <div class="rounded-full w-3/4 h-5 bg-(--primary-soft)">
        <div
          class="rounded-full h-full bg-(--primary) transition-all duration-500"
          :style="{ width: `${percent}%` }"
        />
      </div>
      <p class="text-xs text-(--text-subtle) text-center content-center" />
    </div>

    <div
      v-if="isApplyingSync"
      class="row-span-3 self-start flex flex-col justify-center items-center gap-1 text-xs text-(--text-subtle)"
    >
      <p class="text-(--text-primary) text-base allow-select">
        {{ currentActivity.length > 0 ? $t(`syncPhases.${currentActivity}`) : '' }}
      </p>
      <p class="text-(--text-subtle) text-xs">
        {{ totalMeasurement > 0 ? `${formatBytes(currentMeasurement)} / ${formatBytes(totalMeasurement)}` : '' }}
      </p>
    </div>
  </div>
</template>
