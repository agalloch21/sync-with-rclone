<script setup>
import { PHASES } from '#src/core/phases.js'
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'

const emit = defineEmits(['onClickCancel', 'onClickConfirm'])

const state = inject('state')

const step = computed(() => state.value?.step || '')
const phase = computed(() => state.value?.phase?.name || '')
const mode = computed(() => state.value?.context?.mode || '')
const cancelVisible = computed(() => step.value.length !== 0 && (step.value !== STEPS.ANALYZE || phase.value !== PHASES.PREPARATION), false)
const confirmVisible = computed(() => step.value === STEPS.REVIEW, false)
</script>

<template>
  <TransitionGroup
    tag="div"
    name="slide-fade"
    class="footer-stage flex flex-row justify-end items-center gap-6 px-6 py-4"
  >
    <div
      v-if="cancelVisible"
      key="cancel"
      class="clickable bg-(--surface-soft) px-5 py-2 rounded text-sm font-normal text-(--text-subtle) drop-shadow-[0_4px_4px_#00000010]"
      @click="emit('onClickCancel')"
    >
      {{ $t('cancelButton') }}
    </div>

    <div
      v-if="confirmVisible"
      key="confirm"
      class="clickable bg-(--primary) px-8 py-2 rounded text-sm font-bold text-(--on-primary) drop-shadow-[0_4px_6px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
      @click="emit('onClickConfirm')"
    >
      {{ $t(`confirmButton.${mode}`) }}
    </div>
  </TransitionGroup>
</template>

<style scoped>
.slide-fade-move{
transition: transform 0.5s ease;
}
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 1s 0.5s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  /* transform: translateX(2rem); */
  opacity: 0;
}
</style>
