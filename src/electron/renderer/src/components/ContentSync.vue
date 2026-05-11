<script setup>
import { STEP_META, STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const state = inject('state')
const { t } = useI18n()

const phase = computed(() => state.value?.step === STEPS.SYNC ? (state.value?.phase || '') : '')

const isApplyingSync = computed(() => phase.value === STEP_META[STEPS.SYNC].phases[1])
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

// const description = computed(() => {
//   const activityDescription = (currentActivity.value &&  currentActivity.value.length > 0) ?
// }
//   currentActivity.value
//     ? t(`syncPhases.${currentActivity.value}`, { current: `${formatBytes(currentMeasurement.value)}`, total: `${formatBytes(totalMeasurement.value)}` })
//     : '',
// )
watch(() => state.value?.progress, () => {
  console.log(state.value?.progress?.activity)
  console.log(state.value?.progress?.index)
  console.log(state.value?.progress?.total)
  console.log(state.value?.progress?.measurement)
}, { immediate: true })
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
