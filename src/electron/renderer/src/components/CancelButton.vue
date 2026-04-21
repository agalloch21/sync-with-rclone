<script setup>
import { PHASES } from '#src/core/phases.js'
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed } from 'vue'

const props = defineProps({
  state: Object,
})

const step = computed(() => props.state?.step || '')
const phase = computed(() => props.state?.phase?.name || '')
const enabled = computed(() => step.value !== STEPS.ANALYZE || phase.value !== PHASES.PREPARATION)
</script>

<template>
  <div
    v-if="enabled"
    class="bg-(--surface-soft) px-5 py-2 rounded text-sm font-normal text-(--text-subtle) drop-shadow-[0_4px_4px_#00000010]
  transition-transform hover:scale-105 active:translate-px"
  >
    {{ $t('cancelButton') }}
  </div>
</template>
