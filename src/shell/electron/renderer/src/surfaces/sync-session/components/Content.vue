<script setup>
import { SYNC_SESSION_STAGE } from '#electron/contracts/sync-session-stage.js'
import { computed, inject } from 'vue'
import ContentAnalyze from './ContentAnalyze.vue'
import ContentFinalAcknowledgement from './ContentFinalAcknowledgement.vue'
import ContentReview from './ContentReview.vue'
import ContentSync from './ContentSync.vue'

defineEmits(['autoClose'])
const state = inject('state')
const showFinalAcknowledgement = inject('showFinalAcknowledgement')

const stage = computed(() => state.value?.stage?.length > 0 ? state.value?.stage : '')
// const stage = computed(() => SYNC_SESSION_STAGE.ANALYZE)
</script>

<template>
  <div
    class="content-stage h-full overflow-auto
    [&::-webkit-scrollbar]:w-1
     [&::-webkit-scrollbar-track]:invisible
     [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--text-subtle)_20%,transparent)]
     [&::-webkit-scrollbar-thumb]:rounded-full
     [&::-webkit-scrollbar-thumb]:invisible
     hover:[&::-webkit-scrollbar-thumb]:visible"
  >
    <Transition name="fade" mode="out-in">
      <ContentFinalAcknowledgement v-if="showFinalAcknowledgement" @auto-close="$emit('autoClose')" />
      <ContentAnalyze v-else-if="stage === SYNC_SESSION_STAGE.ANALYZE" />
      <ContentReview v-else-if="stage === SYNC_SESSION_STAGE.REVIEW" />
      <ContentSync v-else-if="stage === SYNC_SESSION_STAGE.SYNC" />
    </Transition>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
/* Active states define the duration and easing */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

/* From/To states define the starting and ending opacity */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
