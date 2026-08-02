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
  <div class="footer-stage flex flex-row justify-end items-center gap-6 px-6 py-4">
    <Transition name="footer-fade">
      <button
        v-if="confirmVisible"
        :disabled="props.hasPendingCommand"
        class="button-primary clickable focusable"
        @click="emit('onClickConfirm')"
      >
        {{ $t(`confirmButton.${mode}`) }}
      </button>
    </Transition>

    <Transition name="footer-fade">
      <button
        v-if="cancelVisible"
        :disabled="props.hasPendingCommand"
        class="button-secondary clickable focusable"
        @click="emit('onClickCancel')"
      >
        {{ $t('cancelButton') }}
      </button>
    </Transition>

    <Transition name="footer-fade">
      <button
        v-if="closeVisible"
        :disabled="props.hasPendingCommand"
        class="button-secondary clickable focusable"
        @click="emit('onClickClose')"
      >
        {{ $t('closeButton') }}
      </button>
    </Transition>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.footer-fade-enter-active,
.footer-fade-leave-active{
  transition: opacity 0.5s ease;
}
.footer-fade-enter-from,
.footer-fade-leave-to{
  opacity: 0;
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
