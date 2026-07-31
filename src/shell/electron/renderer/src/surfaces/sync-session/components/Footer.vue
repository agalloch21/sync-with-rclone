<script setup>
import { SYNC_SESSION_STAGE } from '#electron/contracts/sync-session-stage.js'
import { SYNC_PHASES } from '#src/core/contract.js'
import { computed, inject } from 'vue'

const props = defineProps({
  hasPendingCommand: Boolean,
})

const emit = defineEmits(['onClickCancel', 'onClickConfirm', 'onClickClose'])

const state = inject('state')
const showFinalAcknowledgement = inject('showFinalAcknowledgement')

const stage = computed(() => state.value?.stage || '')
const phase = computed(() => state.value?.phase || '')
const mode = computed(() => state.value?.context?.mode || '')
const cancelVisible = computed(() => showFinalAcknowledgement.value === false && stage.value.length !== 0 && (stage.value !== SYNC_SESSION_STAGE.ANALYZE || phase.value !== SYNC_PHASES.PREPARATION), false)
const confirmVisible = computed(() => showFinalAcknowledgement.value === false && stage.value === SYNC_SESSION_STAGE.REVIEW, false)
const closeVisible = computed(() => showFinalAcknowledgement.value)
</script>

<template>
  <TransitionGroup
    tag="div"
    name="slide-fade"
    class="footer-stage flex flex-row justify-end items-center gap-6 px-6 py-4 relative"
  >
    <button
      v-if="confirmVisible"
      key="confirm"
      :disabled="props.hasPendingCommand"
      class="button-primary clickable focusable"
      @click="emit('onClickConfirm')"
    >
      {{ $t(`confirmButton.${mode}`) }}
    </button>

    <button
      v-if="cancelVisible"
      key="cancel"
      :disabled="props.hasPendingCommand"
      class="button-secondary clickable focusable"
      @click="emit('onClickCancel')"
    >
      {{ $t('cancelButton') }}
    </button>

    <button
      v-if="closeVisible"
      key="close"
      :disabled="props.hasPendingCommand"
      class="button-secondary clickable focusable"
      @click="emit('onClickClose')"
    >
      {{ $t('closeButton') }}
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

.slide-fade-leave-active {
position:absolute;
}

.button-secondary{
    @apply bg-(--surface-soft) px-5 py-2 rounded
    text-sm font-normal text-(--text-subtle) drop-shadow-[0_4px_4px_#00000010];
}

.button-primary{
    @apply bg-(--primary) px-8 py-2 rounded
    text-sm font-bold text-(--on-primary) drop-shadow-[0_4px_6px_color-mix(in_srgb,var(--primary)_40%,transparent)];
}
</style>
