<script setup>
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed } from 'vue'

const props = defineProps({
  state: Object,
})
const step = computed(() => props.state?.step || STEPS.ANALYZE)
</script>

<template>
  <div class="header-stage flex flex-row justify-center gap-2 text-xs">
    <div v-for="(value, key, index) in STEPS" :key="value" class="flex flex-row items-center gap-2">
      <div
        class="w-8 rounded-xl aspect-square text-center content-center font-semibold"
        :class="step === value ? ['bg-(--primary)', 'text-(--on-primary)'] : ['bg-(--primary-soft)', 'text-(--text-primary)', 'opacity-40']"
      >
        {{ index + 1 }}
      </div>
      <div
        class="text-(--text-primary)"
        :class="step === value ? ['font-extrabold'] : ['font-medium', 'opacity-40'] "
      >
        {{ $t(`${value}.title`) }}
      </div>
      <div v-if="index !== Object.keys(STEPS).length - 1" class="bg-(--border-accent-fade) w-8 h-0.5" />
    </div>
  </div>
</template>
