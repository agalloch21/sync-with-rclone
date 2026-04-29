<script setup>
import { PHASES } from '#src/core/phases.js'
import { SESSION_STATES, STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'

const emit = defineEmits(['onClickCancel', 'onClickConfirm', 'onClickClose'])

const state = inject('state')
const showFinalAcknowledgement = inject('showFinalAcknowledgement')

const step = computed(() => state.value?.step || '')
const phase = computed(() => state.value?.phase?.name || '')
const mode = computed(() => state.value?.context?.mode || '')
const cancelVisible = computed(() => showFinalAcknowledgement.value === false && step.value.length !== 0 && (step.value !== STEPS.ANALYZE || phase.value !== PHASES.PREPARATION), false)
const confirmVisible = computed(() => showFinalAcknowledgement.value === false && step.value === STEPS.REVIEW, false)
const closeVisible = computed(() => showFinalAcknowledgement.value)
</script>

<template>
  <TransitionGroup
    tag="div"
    name="slide-fade"
    class="footer-stage flex flex-row justify-end items-center gap-6 px-6 py-4"
  >
    <button
      v-if="cancelVisible"
      key="cancel"
      class="button-secondary"
      @click="emit('onClickCancel')"
    >
      {{ $t('cancelButton') }}
    </button>

    <button
      v-if="closeVisible"
      key="close"
      class="button-secondary"
      @click="emit('onClickClose')"
    >
      {{ $t('closeButton') }}
    </button>

    <button
      v-if="confirmVisible"
      key="confirm"
      class="button-primary"
      @click="emit('onClickConfirm')"
    >
      {{ $t(`confirmButton.${mode}`) }}
    </button>
  </TransitionGroup>
</template>

<style scoped>
@reference "tailwindcss";
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

.button-secondary{
    @apply bg-(--surface-soft) px-5 py-2 rounded
    text-sm font-normal text-(--text-subtle) drop-shadow-[0_4px_4px_#00000010]
    clickable forcusable;
}

.button-primary{
    @apply bg-(--primary) px-8 py-2 rounded
    text-sm font-bold text-(--on-primary) drop-shadow-[0_4px_6px_color-mix(in_srgb,var(--primary)_40%,transparent)]
    clickable forcusable;
}
</style>
