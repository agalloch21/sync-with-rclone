<script setup>
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed } from 'vue'

const props = defineProps({
  state: Object,
})

const mode = computed(() => props.state?.context?.mode || '')
const step = computed(() => props.state?.step || '')
const enabled = computed(() => step.value === STEPS.REVIEW)
</script>

<template>
  <div
    v-if="enabled"
    class="clickable bg-(--primary) px-8 py-2 rounded text-sm font-bold text-(--on-primary) drop-shadow-[0_4px_6px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
  >
    {{ $t(`confirmButton.${mode}`) }}
  </div>
</template>
