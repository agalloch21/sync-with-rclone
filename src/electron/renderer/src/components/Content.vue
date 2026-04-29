<script setup>
import { SESSION_STATES, STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject } from 'vue'
import ContentAnalyze from './ContentAnalyze.vue'
import ContentFinalAcknowledgement from './ContentFinalAcknowledgement.vue'
import ContentReview from './ContentReview.vue'
import ContentSync from './ContentSync.vue'

const state = inject('state')
const showFinalAcknowledgement = inject('showFinalAcknowledgement')

const step = computed(() => state.value?.step?.length > 0 ? props.state.step : '')
</script>

<template>
  <div class="content-stage h-full overflow-auto">
    <Transition name="fade" mode="out-in">
      <ContentFinalAcknowledgement v-if="showFinalAcknowledgement" />
      <ContentAnalyze v-else-if="step === STEPS.ANALYZE" />
      <ContentReview v-else-if="step === STEPS.REVIEW" />
      <ContentSync v-else-if="step === STEPS.SYNC" />
    </Transition>
  </div>
</template>

<style scoped>
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
